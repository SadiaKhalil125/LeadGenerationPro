from fastapi import APIRouter, HTTPException
from typing import Dict, List
import httpx
import json
from datetime import datetime
from routers.get_db_connection import get_db_cursor
from api_source_models import (
    ApiSourceRequest, ApiSourceInfo, ApiSourcesListResponse,
    ApiSourceTestRequest, ApiSourceTestResponse
)
from jsonpath_ng import parse as jsonpath_parse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/")
async def create_api_source(request: ApiSourceRequest):
    """Create a new API source"""
    try:
        conn, cur = get_db_cursor()
        
        # Check if entity table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables WHERE table_name = %s
            )
        """, (request.entity_name.lower(),))
        
        entity_exists = cur.fetchone()[0]
        if not entity_exists:
            logger.warning(f"⚠️  Entity table '{request.entity_name}' does not exist yet.")
        
        cur.execute("""
            INSERT INTO api_sources (
                name, api_url, api_key, request_template, 
                response_structure, data_extraction_path, 
                entity_name, field_mappings
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            request.name,
            request.api_url,
            request.api_key, 
            json.dumps(request.request_template.dict()),
            json.dumps(request.response_structure.dict()),
            request.response_structure.data_path,
            request.entity_name,
            json.dumps([m.dict() for m in request.field_mappings])
        ))
        
        source_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        
        return {"success": True, "id": source_id, "message": "API source created successfully"}
        
    except Exception as e:
        logger.error(f"❌ Error creating API source: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create API source: {str(e)}")

@router.put("/{source_id}")
async def update_api_source(source_id: int, request: ApiSourceRequest):
    """Update an existing API source"""
    try:
        conn, cur = get_db_cursor()
        
        # Check if source exists
        cur.execute("SELECT id FROM api_sources WHERE id = %s", (source_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="API source not found")

        # Update Query
        sql = """
            UPDATE api_sources SET
                name = %s,
                api_url = %s,
                entity_name = %s,
                request_template = %s,
                response_structure = %s,
                data_extraction_path = %s,
                field_mappings = %s
        """
        params = [
            request.name,
            request.api_url,
            request.entity_name,
            json.dumps(request.request_template.dict()),
            json.dumps(request.response_structure.dict()),
            request.response_structure.data_path,
            json.dumps([m.dict() for m in request.field_mappings])
        ]

        # Only update API key if provided (allow keeping existing one)
        if request.api_key:
            sql += ", api_key = %s"
            params.append(request.api_key)

        sql += " WHERE id = %s"
        params.append(source_id)

        cur.execute(sql, tuple(params))
        conn.commit()
        cur.close()

        logger.info(f"✅ API source updated: {request.name} (ID: {source_id})")
        
        return {"success": True, "id": source_id, "message": "API source updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating API source: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update API source: {str(e)}")

@router.get("/")
async def list_api_sources() -> ApiSourcesListResponse:
    """List all API sources with full details for editing"""
    try:
        conn, cur = get_db_cursor()
        
        # Fetch request_template and response_structure explicitly
        cur.execute("""
            SELECT id, name, api_url, entity_name, 
                   request_template, response_structure, field_mappings, created_at
            FROM api_sources
            ORDER BY created_at DESC
        """)
        
        rows = cur.fetchall()
        sources = []
        
        for row in rows:
            # Handle JSON parsing if the driver returns string, otherwise use direct dict
            req_template = row[4] if isinstance(row[4], dict) else (json.loads(row[4]) if row[4] else {})
            resp_structure = row[5] if isinstance(row[5], dict) else (json.loads(row[5]) if row[5] else {})
            field_mappings = row[6] if row[6] else []
            
            # Ensure mappings are list of dicts
            if isinstance(field_mappings, str):
                field_mappings = json.loads(field_mappings)

            sources.append(ApiSourceInfo(
                id=row[0],
                name=row[1],
                api_url=row[2],
                entity_name=row[3],
                request_template=req_template,
                response_structure=resp_structure,
                field_mappings=field_mappings, # Now passing actual mappings
                created_at=row[7]
            ))
        
        cur.close()
        
        return ApiSourcesListResponse(
            total_sources=len(sources),
            sources=sources
        )
        
    except Exception as e:
        logger.error(f"❌ Error listing API sources: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch API sources: {str(e)}")

@router.get("/{source_id}")
async def get_api_source(source_id: int) -> ApiSourceInfo:
    """Get specific API source details"""
    try:
        conn, cur = get_db_cursor()
        
        cur.execute("""
            SELECT id, name, api_url, entity_name, 
                   request_template, response_structure, field_mappings, created_at
            FROM api_sources WHERE id = %s
        """, (source_id,))
        
        row = cur.fetchone()
        cur.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="API source not found")
        
        req_template = row[4] if isinstance(row[4], dict) else (json.loads(row[4]) if row[4] else {})
        resp_structure = row[5] if isinstance(row[5], dict) else (json.loads(row[5]) if row[5] else {})
        field_mappings = row[6] if row[6] else []

        if isinstance(field_mappings, str):
            field_mappings = json.loads(field_mappings)
            
        return ApiSourceInfo(
            id=row[0],
            name=row[1],
            api_url=row[2],
            entity_name=row[3],
            request_template=req_template,
            response_structure=resp_structure,
            field_mappings=field_mappings,
            created_at=row[7]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching API source: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch API source: {str(e)}")

# ... (Keep test_api_source and delete_api_source as they are) ...
@router.post("/{source_id}/test")
async def test_api_source(source_id: int) -> Dict:
    """Test API connection and response parsing"""
    try:
        conn, cur = get_db_cursor()
        
        cur.execute("""
            SELECT api_url, api_key, request_template, 
                   data_extraction_path, field_mappings
            FROM api_sources WHERE id = %s
        """, (source_id,))
        
        row = cur.fetchone()
        cur.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="API source not found")
        
        api_url, api_key, request_template, data_path, field_mappings = row
        
        # Build request
        if isinstance(request_template, str):
            template = json.loads(request_template)
        else:
            template = request_template if request_template else {}
        headers = template.get('headers', {}).copy()
        
        if api_key:
            headers['Authorization'] = f"Bearer {api_key}"
        
        # Make test call
        try:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    method=template.get('method', 'GET'),
                    url=api_url,
                    headers=headers,
                    params=template.get('params'),
                    json=template.get('body'),
                    timeout=template.get('timeout', 30)
                )
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to connect to API: {str(e)}",
                "error": str(e)
            }
        
        # Try to parse JSON
        try:
            response_data = response.json()
        except:
            return {
                "success": False,
                "message": "Response is not valid JSON",
                "error": response.text[:200]
            }
        
        # Try to extract data
        try:
            jsonpath_expr = jsonpath_parse(data_path)
            matches = jsonpath_expr.find(response_data)
            
            if not matches:
                return {
                    "success": False,
                    "message": f"No data found at path '{data_path}'",
                    "response_keys": list(response_data.keys()) if isinstance(response_data, dict) else "Not a dict"
                }
            
            extracted_data = matches[0].value
            
            # Allow single object returns as well, wrap in list
            if isinstance(extracted_data, dict):
                 extracted_data = [extracted_data]

            if not isinstance(extracted_data, list):
                return {
                    "success": False,
                    "message": f"Data at path '{data_path}' is not a list (got {type(extracted_data).__name__})",
                }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error extracting data: {str(e)}",
                "error": str(e)
            }
        
        return {
            "success": True,
            "message": f"✅ Successfully extracted {len(extracted_data)} items",
            "sample_item": extracted_data[0] if extracted_data else {},
            "total_items": len(extracted_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error testing API source: {str(e)}")
        return {
            "success": False,
            "message": f"Test failed: {str(e)}",
            "error": str(e)
        }


@router.delete("/{source_id}")
async def delete_api_source(source_id: int):
    """Delete API source"""
    try:
        conn, cur = get_db_cursor()
        
        # Check if any tasks use this source
        cur.execute(
            "SELECT COUNT(*) FROM tasks WHERE api_source_id = %s",
            (source_id,)
        )
        result = cur.fetchone()
        count = result[0] if result else 0
        
        if count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete: {count} task(s) still using this API source"
            )
        
        cur.execute("DELETE FROM api_sources WHERE id = %s", (source_id,))
        conn.commit()
        cur.close()
        
        return {
            "success": True,
            "message": "API source deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete API source: {str(e)}")