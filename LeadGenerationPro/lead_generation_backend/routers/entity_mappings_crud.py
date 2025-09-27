from fastapi import HTTPException
from fastapi import Body
from models import MappingsListResponse, MappingInfo, MappingFormRequest
from psycopg2.extras import Json
from urllib.parse import urlparse
from routers.source_crud import save_source
from fastapi import APIRouter
from routers.get_db_connection import get_db_cursor

router = APIRouter()

def generate_mapping_name(entity_name: str, url: str) -> str:
    host = (urlparse(str(url)).hostname or "unknown").split('.')[0]
    return f"{entity_name}_{host}_mapping".lower()

@router.post("/save-entity-mapping", response_model=dict)
async def save_entity_mapping(mapping: MappingFormRequest):
    """
    Save scraping configurations for one or more entities against one source.
    Steps:
    1. Ensure the source is saved.
    2. For each entity mapping:
       - Validate entity table exists.
       - Validate mapping field keys match table columns.
       - Save mapping linked to source_id with enabled status.
    """

    conn, cur = get_db_cursor()
    try:
        # Normalize URL before inserting
        normalized_url = str(mapping.url)
        if normalized_url and not normalized_url.startswith(('http://', 'https://')):
            normalized_url = f'https://{normalized_url}'

        # Save/verify the source
        source_result = await save_source(mapping.source, normalized_url)
        source_id = source_result.get("id")
        if not source_id:
            raise HTTPException(status_code=500, detail="Failed to retrieve source_id.")

        # Ensure entity_mappings table exists with enabled column
        cur.execute("""
            CREATE TABLE IF NOT EXISTS entity_mappings (
                id SERIAL PRIMARY KEY,
                entity_name TEXT NOT NULL,
                source_id INT REFERENCES sources(id) ON DELETE CASCADE,
                mapping_name TEXT NOT NULL UNIQUE,
                container_selector TEXT,
                field_mappings JSONB NOT NULL,
                enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT unique_entity_source UNIQUE (entity_name, source_id)
            );
        """)

        # Add enabled column if it doesn't exist (for existing tables)
        cur.execute("""
            ALTER TABLE entity_mappings 
            ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
        """)

        saved_mappings = []

        # Process each entity mapping in the request
        for em in mapping.entity_mappings:
            entity_name = em.entity_name.strip()
            if not entity_name:
                raise HTTPException(status_code=400, detail="Entity name cannot be empty.")

            if not em.field_mappings:
                raise HTTPException(status_code=400, detail=f"No field mappings for {entity_name}.")

            # Check entity table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables WHERE table_name = %s
                )
            """, (entity_name,))
            if not cur.fetchone()[0]:
                raise HTTPException(status_code=400, detail=f"Entity table '{entity_name}' does not exist.")

            # Validate field mapping keys
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s", (entity_name,))
            existing_columns = {row[0] for row in cur.fetchall()}
            invalid = [field for field in em.field_mappings.keys() if field not in existing_columns]
            if invalid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid fields {invalid} for '{entity_name}'. Valid columns: {sorted(existing_columns)}"
                )

            # Serialize mappings and generate mapping_name
            serialized = {
                key: {"selector": fm.selector, "extract": fm.extract}
                for key, fm in em.field_mappings.items()
            }
            mapping_name = f"{entity_name}-{mapping.source}-mapping"

            # Insert or update mapping with enabled status
            cur.execute("""
                INSERT INTO entity_mappings (entity_name, source_id, mapping_name, container_selector, field_mappings, enabled)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (entity_name, source_id)
                DO UPDATE SET
                    container_selector = EXCLUDED.container_selector,
                    field_mappings = EXCLUDED.field_mappings,
                    enabled = EXCLUDED.enabled,
                    created_at = NOW()
                RETURNING id;
            """, (entity_name, source_id, mapping_name, em.container_selector, Json(serialized), em.enabled))

            mapping_id = cur.fetchone()[0]
            saved_mappings.append({
                "mapping_name": mapping_name,
                "enabled": em.enabled
            })

        conn.commit()
        return {
            "success": True,
            "message": f"{len(saved_mappings)} entity mappings saved for source '{mapping.source}'.",
            "saved_mappings": saved_mappings
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save entity mappings: {str(e)}")
    finally:
        cur.close()

# Update your existing /mappings endpoint in the mapping router

@router.get("/mappings", response_model=MappingsListResponse)
async def get_all_mappings():
    """Get all saved entity mappings including enabled status."""
    try:
        conn, cur = get_db_cursor()
        
        # Add the enabled column if it doesn't exist
        cur.execute("""
            ALTER TABLE entity_mappings 
            ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
        """)
        
        # Update any NULL values to TRUE
        cur.execute("""
            UPDATE entity_mappings 
            SET enabled = TRUE 
            WHERE enabled IS NULL;
        """)
        
        cur.execute("""
            SELECT em.id,
                   em.entity_name,
                   em.mapping_name,
                   em.container_selector,
                   em.field_mappings,
                   COALESCE(em.enabled, TRUE) as enabled,
                   em.created_at,
                   em.source_id,
                   s.name AS source_name,
                   s.url AS source_url
            FROM entity_mappings em
            JOIN sources s ON em.source_id = s.id
            ORDER BY em.created_at DESC;
        """)

        rows = cur.fetchall()
        mappings = []
        
        for row in rows:
            mappings.append(MappingInfo(
                id=row[0],
                entity_name=row[1],
                mapping_name=row[2],
                container_selector=row[3],
                field_mappings=row[4],
                enabled=row[5],  # This should now always be True/False, not None
                created_at=row[6],
                source_id=row[7],
                source_name=row[8],
                url=row[9]
            ))
        
        cur.close()
        
        return MappingsListResponse(
            total_mappings=len(mappings),
            mappings=mappings
        )
        
    except Exception as e:
        print(f"Error fetching mappings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch mappings: {str(e)}")

@router.put("/edit-mapping/{mapping_name}", response_model=dict)
async def edit_mapping(mapping_name: str, payload: dict = Body(...)):
    """
    Edit an existing entity mapping by mapping_name.
    Payload can include: mapping_name, container_selector, field_mappings, source_id, enabled
    """
    connection = None
    try:
        connection, cur = get_db_cursor()
        mapping_name = mapping_name.strip()
        if not mapping_name:
            raise HTTPException(status_code=400, detail="Mapping name is required.")

        # Check if mapping exists
        cur.execute("SELECT id FROM entity_mappings WHERE mapping_name = %s;", (mapping_name,))
        mapping = cur.fetchone()
        if not mapping:
            raise HTTPException(status_code=404, detail=f"Mapping '{mapping_name}' not found.")

        # Get the values from payload, with fallbacks
        new_mapping_name = payload.get("mapping_name", mapping_name)
        container_selector = payload.get("container_selector")
        field_mappings = payload.get("field_mappings", {})
        source_id = payload.get("source_id")
        enabled = payload.get("enabled", True)  # Default to True if not provided

        # Update the mapping
        cur.execute("""
            UPDATE entity_mappings
            SET mapping_name = %s,
                container_selector = %s,
                field_mappings = %s,
                source_id = %s,
                enabled = %s
            WHERE mapping_name = %s;
        """, (
            new_mapping_name,
            container_selector,
            Json(field_mappings),
            source_id,
            enabled,
            mapping_name
        ))

        connection.commit()
        cur.close()
        connection.close()

        return {
            "success": True,
            "message": f"Mapping '{mapping_name}' updated successfully.",
            "updated_mapping": {
                "mapping_name": new_mapping_name,
                "container_selector": container_selector,
                "field_mappings": field_mappings,
                "source_id": source_id,
                "enabled": enabled
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        if connection:
            connection.rollback()
            connection.close()
        raise HTTPException(status_code=500, detail=f"Failed to update mapping: {str(e)}")

@router.put("/toggle-mapping-status/{mapping_name}", response_model=dict)
async def toggle_mapping_status(mapping_name: str):
    """Toggle the enabled/disabled status of a mapping."""
    try:
        conn, cur = get_db_cursor()
        mapping_name = mapping_name.strip()
        if not mapping_name:
            raise HTTPException(status_code=400, detail="Mapping name is required.")

        # Get current status
        cur.execute("SELECT enabled FROM entity_mappings WHERE mapping_name = %s;", (mapping_name,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail=f"Mapping '{mapping_name}' not found.")

        current_status = result[0] if result[0] is not None else True
        new_status = not current_status

        # Update status
        cur.execute("""
            UPDATE entity_mappings 
            SET enabled = %s 
            WHERE mapping_name = %s;
        """, (new_status, mapping_name))

        conn.commit()
        cur.close()

        return {
            "success": True,
            "message": f"Mapping '{mapping_name}' {'enabled' if new_status else 'disabled'} successfully.",
            "mapping_name": mapping_name,
            "enabled": new_status
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to toggle mapping status: {str(e)}")

@router.delete("/delete-mapping/{mapping_name}", response_model=dict)
async def delete_mapping(mapping_name: str):
    """Delete an entity mapping by its mapping_name."""
    try:
        conn, cur = get_db_cursor()
        mapping_name = mapping_name.strip()
        if not mapping_name:
            raise HTTPException(status_code=400, detail="Mapping name is required.")

        # Check if mapping exists
        cur.execute("SELECT id FROM entity_mappings WHERE mapping_name = %s;", (mapping_name,))
        mapping = cur.fetchone()
        if not mapping:
            cur.close()
            raise HTTPException(status_code=404, detail=f"Mapping '{mapping_name}' not found.")

        # Delete mapping
        cur.execute("DELETE FROM entity_mappings WHERE mapping_name = %s;", (mapping_name,))
        conn.commit()
        cur.close()

        return {
            "success": True,
            "message": f"Mapping '{mapping_name}' deleted successfully.",
            "mapping_name": mapping_name
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete mapping: {str(e)}")

@router.get("/mappings-by-source/{source_id}")
async def get_mappings_by_source(source_id: int):
    """Get all mappings for a specific source by ID, including enabled status."""
    try:
        conn, cur = get_db_cursor()
        
        cur.execute("""
            SELECT em.id, em.mapping_name, em.entity_name, em.container_selector, em.enabled
            FROM entity_mappings em
            WHERE em.source_id = %s
            ORDER BY em.created_at DESC
        """, (source_id,))
        
        rows = cur.fetchall()
        
        if not rows:
            raise HTTPException(status_code=404, detail="No mappings found for this source")
        
        mappings = []
        for row in rows:
            mappings.append({
                "id": row[0],
                "mapping_name": row[1],
                "entity_name": row[2],
                "container_selector": row[3],
                "enabled": row[4] if row[4] is not None else True
            })
        
        cur.close()
        
        return {
            "success": True,
            "total_mappings": len(mappings),
            "mappings": mappings
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch mappings: {str(e)}")