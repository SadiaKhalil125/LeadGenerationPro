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
    Fixed: Null-safe merging, automated path cleaning, and verbose debug logging.
    """
    execution_id = str(uuid.uuid4())
    execution_start = datetime.now()
    conn = None
    
    try:
        conn, cur = get_db_cursor()
        
        # 1. Fetch Task + Config + Source Details
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
        
        if not task_data:
            logger.warning(f"⚠️ Task {task_id} not found (likely deleted).")
            return {"success": False, "message": "Task no longer exists"}
        
        (task_id_db, task_name, api_source_id, max_items, task_config_json,
         source_id, source_name, api_url, api_key,
         source_template_json, data_extraction_path,
         entity_name, field_mappings_json) = task_data
        
        log_execution(conn, task_id, execution_id, 'processing', 'info', f'Executing API task: {task_name}')
        
        # 2. Parse JSON Configurations safely
        # Ensure we are working with dictionaries
        def to_dict(data):
            if isinstance(data, dict): return data
            if isinstance(data, str): return json.loads(data)
            return {}

        source_template = to_dict(source_template_json)
        task_config = to_dict(task_config_json)
        field_mappings = field_mappings_json if isinstance(field_mappings_json, list) else to_dict(field_mappings_json)
        
        # 3. MERGE LOGIC (Source Defaults + Task Overrides)
        final_headers = (source_template.get('headers') or {}).copy()
        if api_key:
            final_headers['Authorization'] = f"Bearer {api_key}"
        if task_config.get('headers'):
            final_headers.update(task_config['headers'])

        final_params = (source_template.get('params') or {}).copy()
        # This is where 'q' from the task config gets added to the 'per_page' from the source
        if task_config.get('params'):
            final_params.update(task_config['params'])

        final_body = (source_template.get('body') or {}).copy()
        if task_config.get('body'):
            final_body.update(task_config['body'])

        final_method = task_config.get('method') or source_template.get('method', 'GET')
        
        # DEBUG LOG: See exactly what is being sent to the API
        logger.info(f"🚀 TASK {task_id} PREPARING CALL: {api_url}")
        logger.info(f"🛠️ MERGED PARAMS: {final_params}")
        
        # 4. Call API
        api_start = datetime.now()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    method=final_method,
                    url=api_url,
                    headers=final_headers,
                    params=final_params,
                    json=final_body if final_body and final_method != "GET" else None,
                    timeout=source_template.get('timeout', 30)
                )
        except Exception as e:
            error_msg = f"Network Error: {str(e)}"
            log_execution(conn, task_id, execution_id, 'failed', 'error', error_msg)
            return {"success": False, "message": error_msg}
        
        if response.status_code >= 400:
            error_msg = f"API returned {response.status_code}: {response.text[:200]}"
            log_execution(conn, task_id, execution_id, 'failed', 'error', error_msg)
            return {"success": False, "message": error_msg}
        
        # 5. Parse Response & Extract
        response_data = response.json()
        
        # Clean Path Syntax
        clean_path = data_extraction_path.strip() if data_extraction_path else "$"
        if clean_path in ["$.", ""]: clean_path = "$"

        try:
            jsonpath_expr = jsonpath_parse(clean_path)
            matches = jsonpath_expr.find(response_data)
            if not matches:
                return {"success": False, "message": f"No data at path {clean_path}"}
            
            extracted_data = matches[0].value
            if isinstance(extracted_data, dict): extracted_data = [extracted_data]
            if not isinstance(extracted_data, list):
                return {"success": False, "message": "Extraction did not result in a list"}
                
        except Exception as e:
            return {"success": False, "message": f"JSONPath Error: {str(e)}"}
        
        # 6. Map & Upsert
        items_upserted = 0
        for item in extracted_data[:max_items]:
            try:
                entity_record = {}
                for mapping in field_mappings:
                    # Handle both Dict and Pydantic style mapping objects
                    m = mapping if isinstance(mapping, dict) else mapping.dict()
                    api_f = m.get('api_field')
                    db_f = m.get('db_field')
                    
                    if api_f.startswith('$.'):
                        f_expr = jsonpath_parse(api_f)
                        f_match = f_expr.find(item)
                        entity_record[db_f] = f_match[0].value if f_match else None
                    else:
                        entity_record[db_f] = item.get(api_f)
                
                await upsert_entity_record(cur, entity_name, f"api_{source_name.lower()}", entity_record)
                items_upserted += 1
            except:
                continue
        
        conn.commit()
        cur.execute("UPDATE tasks SET last_executed_at = NOW() WHERE id = %s", (task_id,))
        conn.commit()
        
        log_execution(conn, task_id, execution_id, 'completed', 'info', f'Processed {items_upserted} items')
        return {"success": True, "items_upserted": items_upserted}
        
    except Exception as e:
        logger.error(f"❌ API Executor Error: {str(e)}\n{traceback.format_exc()}")
        if conn: conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            cur.close()
            conn.close()