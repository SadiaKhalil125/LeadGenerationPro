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
    Execute API-based task with:
    1. Auto-Migration for api_key_name.
    2. Null-safe parameter merging.
    3. Strict Method & Body handling (Forces POST/PUT when set).
    """
    execution_id = str(uuid.uuid4())
    execution_start = datetime.now()
    conn = None
    
    try:
        conn, cur = get_db_cursor()

        # --- STEP 0: AUTO-MIGRATION ---
        cur.execute("""
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='api_sources' AND column_name='api_key_name') THEN
                    ALTER TABLE api_sources ADD COLUMN api_key_name VARCHAR(255) DEFAULT 'Authorization';
                END IF;
            END $$;
        """)
        conn.commit()

        # --- STEP 1: FETCH DATA ---
        cur.execute("""
            SELECT 
                t.id, t.task_name, t.api_source_id, t.max_items, t.api_request_config,
                a.id, a.name, a.api_url, a.api_key, a.api_key_name,
                a.request_template, a.data_extraction_path,
                a.entity_name, a.field_mappings
            FROM tasks t
            JOIN api_sources a ON t.api_source_id = a.id
            WHERE t.id = %s
        """, (task_id,))
        
        task_data = cur.fetchone()
        if not task_data:
            return {"success": False, "message": "Task not found"}
        
        (task_id_db, task_name, api_source_id, max_items, task_config_json,
         source_id, source_name, api_url, api_key, api_key_name,
         source_template_json, data_extraction_path,
         entity_name, field_mappings_json) = task_data
        
        # --- STEP 2: SAFE JSON PARSING ---
        def to_dict(data):
            if isinstance(data, dict): return data
            if isinstance(data, str): 
                try: return json.loads(data)
                except: return {}
            return {}

        source_template = to_dict(source_template_json)
        task_config = to_dict(task_config_json)
        field_mappings = field_mappings_json if isinstance(field_mappings_json, list) else to_dict(field_mappings_json)

        # --- STEP 3: STRICT METHOD SELECTION ---
        # raw_method = task_config.get('method') or source_template.get('method') or 'GET'
        # final_method = str(raw_method).upper()
        raw_method = source_template.get('method') or task_config.get('method') or 'GET'
        final_method = str(raw_method).upper()

        # --- STEP 4: NULL-SAFE MERGE LOGIC ---
        final_headers = (source_template.get('headers') or {}).copy()
        
        if api_key:
            auth_header_name = api_key_name if api_key_name else 'Authorization'
            if auth_header_name.lower() == 'authorization':
                final_headers[auth_header_name] = f"Bearer {api_key}"
            else:
                final_headers[auth_header_name] = api_key
        
        if task_config.get('headers'):
            final_headers.update(task_config['headers'])

        final_params = (source_template.get('params') or {}).copy()
        if task_config.get('params'):
            final_params.update(task_config['params'])

        final_body = (task_config.get('body') or source_template.get('body') or {}).copy()

        # --- STEP 5: LOGGING ---
        logger.info(f"🚀 EXECUTING: {final_method} {api_url}")
        
        try:
            log_execution(conn, task_id, execution_id, 'processing', 'info', f'Request: {final_method}')
        except: pass

        # --- STEP 6: DYNAMIC API CALL ---
        async with httpx.AsyncClient() as client:
            request_args = {
                "method": final_method,
                "url": api_url,
                "headers": final_headers,
                "params": final_params,
                "timeout": source_template.get('timeout', 30)
            }
            
            # httpx will fail if body is passed to a GET request
            if final_method != "GET" and final_body:
                request_args["json"] = final_body

            response = await client.request(**request_args)

        # --- STEP 7: ERROR HANDLING ---
        if response.status_code >= 400:
            error_msg = f"API Error {response.status_code}: {response.text[:500]}"
            log_execution(conn, task_id, execution_id, 'failed', 'error', error_msg)
            return {"success": False, "message": error_msg}

        # --- STEP 8: EXTRACTION & MAPPING ---
        response_data = response.json()
        clean_path = data_extraction_path.strip() if data_extraction_path else "$"
        if clean_path in ["$.", ""]: clean_path = "$"

        jsonpath_expr = jsonpath_parse(clean_path)
        matches = jsonpath_expr.find(response_data)
        extracted_data = matches[0].value if matches else []
        if isinstance(extracted_data, dict): extracted_data = [extracted_data]

        items_upserted = 0
        for item in extracted_data[:max_items]:
            try:
                entity_record = {}
                for mapping in field_mappings:
                    m = mapping if isinstance(mapping, dict) else mapping.dict()
                    api_f, db_f = m.get('api_field'), m.get('db_field')
                    
                    if api_f.startswith('$.'):
                        f_match = jsonpath_parse(api_f).find(item)
                        entity_record[db_f] = f_match[0].value if f_match else None
                    else:
                        entity_record[db_f] = item.get(api_f)
                
                await upsert_entity_record(cur, entity_name, f"api_{source_name.lower().replace(' ', '_')}", entity_record)
                items_upserted += 1
            except: continue
        
        conn.commit()
        cur.execute("UPDATE tasks SET last_executed_at = NOW() WHERE id = %s", (task_id,))
        conn.commit()
        
        return {"success": True, "items_upserted": items_upserted, "execution_id": execution_id}

    except Exception as e:
        logger.error(f"❌ Executor Error: {str(e)}")
        return {"success": False, "message": str(e)}
    finally:
        if conn: cur.close(); conn.close()