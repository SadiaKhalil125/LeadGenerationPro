import httpx
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any
from jsonpath_ng import parse as jsonpath_parse
from routers.get_db_connection import get_db_cursor
from routers.task_crud import upsert_entity_record, log_execution
import uuid
import traceback

logger = logging.getLogger(__name__)

async def execute_api_task(task_id: int) -> Dict:
    """
    Execute API-based task with Dynamic Parameter Merging.
    Fixed: Null-safe dictionary handling, JSONPath syntax cleaning, 
    and deleted task protection.
    """
    execution_id = str(uuid.uuid4())
    execution_start = datetime.now()
    conn = None
    
    try:
        conn, cur = get_db_cursor()
        
        # 1. Fetch Task Details
        cur.execute("""
            SELECT 
                t.id, t.task_name, t.api_source_id, t.max_items, t.api_request_config,
                a.id, a.name, a.api_url, a.api_key, 
                a.request_template, a.data_extraction_path,
                a.entity_name, a.field_mappings
            FROM tasks t
            JOIN api_sources a ON t.api_source_id = a.id
            WHERE t.id = %s
        """, (task_id,))
        
        task_data = cur.fetchone()
        
        # GUARD: If task was deleted from DB but picked up from queue
        if not task_data:
            logger.warning(f"⚠️ Task {task_id} not found in database (likely deleted). Skipping execution.")
            return {
                "success": False,
                "task_id": task_id,
                "message": "Task no longer exists",
                "execution_id": execution_id
            }
        
        (task_id_db, task_name, api_source_id, max_items, task_config_json,
         source_id, source_name, api_url, api_key,
         source_template_json, data_extraction_path,
         entity_name, field_mappings_json) = task_data
        
        # Initialize log
        try:
            log_execution(conn, task_id, execution_id, 'processing', 'info', f'Executing API task: {task_name}')
        except:
            pass
        
        # 2. Parse JSON Configurations safely
        source_template = source_template_json if isinstance(source_template_json, dict) else (json.loads(source_template_json) if source_template_json else {})
        task_config = task_config_json if isinstance(task_config_json, dict) else (json.loads(task_config_json) if task_config_json else {})
        field_mappings = field_mappings_json if isinstance(field_mappings_json, list) else (json.loads(field_mappings_json) if field_mappings_json else [])
        
        # 3. MERGE LOGIC (Null-Safe)
        # Fix: Using (get() or {}) handles cases where key exists in DB but is set to null
        final_headers = (source_template.get('headers') or {}).copy()
        if api_key:
            final_headers['Authorization'] = f"Bearer {api_key}"
        if task_config.get('headers'):
            final_headers.update(task_config['headers'])

        final_params = (source_template.get('params') or {}).copy()
        if task_config.get('params'):
            final_params.update(task_config['params'])

        final_body = (source_template.get('body') or {}).copy()
        if task_config.get('body'):
            final_body.update(task_config['body'])

        final_method = task_config.get('method') or source_template.get('method', 'GET')
        
        # 4. Call API
        api_start = datetime.now()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    method=final_method,
                    url=api_url,
                    headers=final_headers,
                    params=final_params,
                    json=final_body if final_body else None,
                    timeout=source_template.get('timeout', 30)
                )
        except Exception as e:
            error_msg = f"Failed to call API: {str(e)}"
            log_execution(conn, task_id, execution_id, 'failed', 'error', error_msg)
            return {"success": False, "message": error_msg, "execution_id": execution_id}
        
        api_duration = int((datetime.now() - api_start).total_seconds() * 1000)
        
        if response.status_code >= 400:
            error_msg = f"API returned {response.status_code}: {response.text[:200]}"
            log_execution(conn, task_id, execution_id, 'failed', 'error', error_msg)
            return {"success": False, "message": error_msg, "execution_id": execution_id}
        
        # 5. Parse Response & Extract Data
        try:
            response_data = response.json()
        except Exception as e:
            error_msg = f"Invalid JSON response: {str(e)}"
            log_execution(conn, task_id, execution_id, 'failed', 'error', error_msg)
            return {"success": False, "message": error_msg, "execution_id": execution_id}
        
        # Fix: Automatically clean "$. " to "$ " to prevent JSONPath Parse errors
        clean_path = data_extraction_path.strip() if data_extraction_path else "$"
        if clean_path == "$." or not clean_path:
            clean_path = "$"

        try:
            jsonpath_expr = jsonpath_parse(clean_path)
            matches = jsonpath_expr.find(response_data)
            
            if not matches:
                error_msg = f"No data found at path '{clean_path}'"
                log_execution(conn, task_id, execution_id, 'failed', 'error', error_msg)
                return {"success": False, "message": error_msg, "execution_id": execution_id}
            
            extracted_data = matches[0].value
            
            # Normalize to list
            if isinstance(extracted_data, dict):
                extracted_data = [extracted_data]
                
            if not isinstance(extracted_data, list):
                error_msg = f"Data at '{clean_path}' is not a list"
                log_execution(conn, task_id, execution_id, 'failed', 'error', error_msg)
                return {"success": False, "message": error_msg, "execution_id": execution_id}
                
        except Exception as e:
            error_msg = f"JSONPath error ({clean_path}): {str(e)}"
            log_execution(conn, task_id, execution_id, 'failed', 'error', error_msg)
            return {"success": False, "message": error_msg, "execution_id": execution_id}
        
        # 6. Map & Upsert
        items_upserted = 0
        items_failed = 0
        
        for i, item in enumerate(extracted_data[:max_items]):
            try:
                entity_record = {}
                for mapping in field_mappings:
                    m = mapping if isinstance(mapping, dict) else mapping.dict()
                    api_field = m.get('api_field')
                    db_field = m.get('db_field')
                    
                    try:
                        # Support nested path mapping within each item
                        if api_field.startswith('$.'):
                            field_expr = jsonpath_parse(api_field)
                            field_matches = field_expr.find(item)
                            entity_record[db_field] = field_matches[0].value if field_matches else None
                        else:
                            entity_record[db_field] = item.get(api_field)
                    except:
                        entity_record[db_field] = None
                
                # Perform DB upsert
                await upsert_entity_record(
                    cur, 
                    entity_name, 
                    f"api_{source_name.lower().replace(' ', '_')}", 
                    entity_record
                )
                items_upserted += 1
                
            except Exception as e:
                items_failed += 1
                continue
        
        conn.commit()
        
        # Update last execution time
        cur.execute("UPDATE tasks SET last_executed_at = NOW() WHERE id = %s", (task_id,))
        conn.commit()
        
        execution_duration = int((datetime.now() - execution_start).total_seconds() * 1000)
        log_execution(conn, task_id, execution_id, 'completed', 'info',
                     f'Processed {items_upserted} items successfully',
                     {'items_upserted': items_upserted, 'duration_ms': execution_duration})
        
        return {
            "success": True,
            "task_id": task_id,
            "items_extracted": len(extracted_data),
            "items_upserted": items_upserted,
            "execution_id": execution_id
        }
        
    except Exception as e:
        logger.error(f"❌ API Executor Error: {str(e)}\n{traceback.format_exc()}")
        if conn:
            try:
                log_execution(conn, task_id, execution_id, 'failed', 'error', f"Critical: {str(e)}")
                conn.commit()
            except:
                pass
        return {"success": False, "message": str(e), "execution_id": execution_id}
        
    finally:
        if conn: 
            cur.close()
            conn.close()