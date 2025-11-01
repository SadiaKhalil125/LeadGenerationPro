from fastapi import HTTPException
from datetime import datetime
import asyncio
from models import SourceInfo, SourcesListResponse, PaginationConfig, SourceUpdateRequest
from utils import extract_value, fetch_page
import asyncio
from fastapi import APIRouter
from routers.get_db_connection import get_db_cursor
from pydantic import BaseModel
from psycopg2.extras import Json

router = APIRouter()



@router.get("/sources", response_model=SourcesListResponse)
async def get_all_sources():
    """
    Get all saved website sources.
    """
    try:
        conn, cur = get_db_cursor()
        #fetch all sources sorted by creation order (id descending for newest first)
        cur.execute("""
            SELECT id, name, url, pagination_config
            FROM sources
            ORDER BY id DESC;
        """)
        rows = cur.fetchall()
        cur.close()

        #Convert rows into response objects
        sources = []
        for row in rows:
            sources.append(SourceInfo(
                id=row[0],
                name=row[1],
                url=row[2],
                pagination_config=PaginationConfig(**row[3]) if row[3] else None
            ))

        return SourcesListResponse(
            total_sources=len(sources),
            sources=sources
        )

    except Exception as e:
        print(f"Error fetching sources: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sources: {str(e)}")

@router.get("/source/{source_id}", response_model=SourceInfo)
async def get_source_by_id(source_id: int):
    """
    Get a specific source by ID.
    """
    try:
        conn, cur = get_db_cursor()
        cur.execute("""
            SELECT id, name, url, pagination_config
            FROM sources
            WHERE id = %s;
        """, (source_id,))
        
        row = cur.fetchone()
        cur.close()
        
        if not row:
            raise HTTPException(status_code=404, detail=f"Source with ID {source_id} not found")
        
        return SourceInfo(
            id=row[0],
            name=row[1],
            url=row[2],
            pagination_config=PaginationConfig(**row[3]) if row[3] else None
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching source: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch source: {str(e)}")


@router.post("/save-source", response_model=dict)
async def save_source(name: str, url: str, pagination_config: PaginationConfig=None):
    """Save a website source in 'sources' table or reuse if it already exists."""
    conn, cur = get_db_cursor()
    try:
        name = name.strip()
        url = url.strip()
        if not name or not url:
            raise HTTPException(status_code=400, detail="Source name and URL required.")

        # 1 Ensure table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sources (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                url TEXT NOT NULL,
                pagination_config JSONB DEFAULT NULL
            );
        """)

        cur.execute("""
            ALTER TABLE sources
            ADD COLUMN IF NOT EXISTS pagination_config JSONB DEFAULT NULL;
        """)

        # 2 Check if source already exists
        cur.execute("SELECT id FROM sources WHERE name = %s;", (name,))
        existing = cur.fetchone()
        if existing:
            existing_id = existing[0]
            return {
                "success": True,
                "id": existing_id,
                "message": f"Source '{name}' already exists—reusing it."
            }

        # 3 Insert a new source
        cur.execute(
            "INSERT INTO sources (name, url, pagination_config) VALUES (%s, %s, %s) RETURNING id;",
            (name, url, Json(pagination_config.model_dump() if pagination_config else None))
        )
        new_id = cur.fetchone()[0]
        conn.commit()

        return {"success": True, "id": new_id, "message": f"Source '{name}' saved successfully."}

    except Exception as e:
        # conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save source: {str(e)}")
    finally:
        cur.close()


@router.put("/source/{source_id}", response_model=dict)
async def update_source(source_id: int, update_request: SourceUpdateRequest):
    """
    Update an existing source by ID.
    """
    conn, cur = get_db_cursor()
    try:
        name = update_request.name.strip()
        url = update_request.url.strip()
        pagination_config = getattr(update_request, "pagination_config", None)

        if not name or not url:
            raise HTTPException(status_code=400, detail="Source name and URL are required.")
        
        # Check if source exists
        cur.execute("SELECT id FROM sources WHERE id = %s;", (source_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail=f"Source with ID {source_id} not found")
        
        # Check for duplicate name
        cur.execute("SELECT id FROM sources WHERE name = %s AND id != %s;", (name, source_id))
        if cur.fetchone():
            raise HTTPException(
                status_code=400, 
                detail=f"Another source with name '{name}' already exists"
            )

        # Update query (include pagination_config if provided)
        if pagination_config is not None:
            cur.execute("""
                UPDATE sources 
                SET name = %s, url = %s, pagination_config = %s 
                WHERE id = %s;
            """, (name, url, Json(pagination_config.model_dump()), source_id))
        else:
            # explicitly clear pagination_config
            cur.execute("""
                UPDATE sources 
                SET name = %s, url = %s, pagination_config = NULL
                WHERE id = %s;
            """, (name, url, source_id))

        
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"Source with ID {source_id} not found")
        
        conn.commit()
        
        return {
            "success": True,
            "id": source_id,
            "message": f"Source '{name}' updated successfully."
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update source: {str(e)}")
    finally:
        cur.close()


@router.delete("/source/{source_id}", response_model=dict)
async def delete_source(source_id: int):
    """
    Delete a source by ID.
    This will also check for dependencies and warn if the source is being used.
    """
    conn, cur = get_db_cursor()
    try:
        # Check if source exists
        cur.execute("SELECT name FROM sources WHERE id = %s;", (source_id,))
        source_row = cur.fetchone()
        if not source_row:
            raise HTTPException(status_code=404, detail=f"Source with ID {source_id} not found")
        
        source_name = source_row[0]
        
        # Check for dependencies in entity_mappings table
        cur.execute("SELECT COUNT(*) FROM entity_mappings WHERE source_id = %s;", (source_id,))
        mapping_count = cur.fetchone()[0]
        
        # Check for dependencies in tasks table
        cur.execute("SELECT COUNT(*) FROM tasks WHERE source_id = %s;", (source_id,))
        task_count = cur.fetchone()[0]
        
        if mapping_count > 0 or task_count > 0:
            dependency_details = []
            if mapping_count > 0:
                dependency_details.append(f"{mapping_count} entity mapping(s)")
            if task_count > 0:
                dependency_details.append(f"{task_count} task(s)")
            
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete source '{source_name}'. It is being used by: {', '.join(dependency_details)}. Please delete dependent items first."
            )
        
        # Delete the source
        cur.execute("DELETE FROM sources WHERE id = %s;", (source_id,))
        
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"Source with ID {source_id} not found")
        
        conn.commit()
        
        return {
            "success": True,
            "message": f"Source '{source_name}' deleted successfully."
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete source: {str(e)}")
    finally:
        cur.close()

@router.delete("/source/{source_id}/force", response_model=dict)
async def force_delete_source(source_id: int):
    """
    Force delete a source by ID, including all its dependencies.
    WARNING: This will cascade delete all related entity mappings and tasks.
    """
    conn, cur = get_db_cursor()
    try:
        # Check if source exists
        cur.execute("SELECT name FROM sources WHERE id = %s;", (source_id,))
        source_row = cur.fetchone()
        if not source_row:
            raise HTTPException(status_code=404, detail=f"Source with ID {source_id} not found")
        
        source_name = source_row[0]
        
        # Count dependencies before deletion
        cur.execute("SELECT COUNT(*) FROM entity_mappings WHERE source_id = %s;", (source_id,))
        mapping_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM tasks WHERE source_id = %s;", (source_id,))
        task_count = cur.fetchone()[0]
        
        # Delete in order: tasks -> entity_mappings -> source
        # Delete tasks first
        cur.execute("DELETE FROM tasks WHERE source_id = %s;", (source_id,))
        
        # Delete entity mappings
        cur.execute("DELETE FROM entity_mappings WHERE source_id = %s;", (source_id,))
        
        # Finally delete the source
        cur.execute("DELETE FROM sources WHERE id = %s;", (source_id,))
        
        conn.commit()
        
        deleted_items = []
        if task_count > 0:
            deleted_items.append(f"{task_count} task(s)")
        if mapping_count > 0:
            deleted_items.append(f"{mapping_count} entity mapping(s)")
        
        message = f"Source '{source_name}' and all its dependencies deleted successfully."
        if deleted_items:
            message += f" Deleted: {', '.join(deleted_items)}"
        
        return {
            "success": True,
            "message": message,
            "deleted_dependencies": {
                "tasks": task_count,
                "entity_mappings": mapping_count
            }
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to force delete source: {str(e)}")
    finally:
        cur.close()