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
                follow_links JSONB,
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
        
        # Add follow_links column if it doesn't exist
        cur.execute("""
            ALTER TABLE entity_mappings 
            ADD COLUMN IF NOT EXISTS follow_links JSONB;
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
            
            # Automatically add columns for follow_links field names
            # Fields from detail pages use the field name directly (as configured in the mapping)
            # No prefixing - the field name matches the entity attribute name
            if em.follow_links:
                from psycopg2 import sql
                columns_added = []
                
                for fl in em.follow_links:
                    link_name = fl.name.strip()
                    if not link_name:
                        continue
                    # For each field in the follow_link, use the field name directly
                    for field_name in fl.field_mappings.keys():
                        # Clean the field name to match database naming conventions
                        clean_field_name = field_name.strip().lower().replace(' ', '_').replace('-', '_')
                        clean_field_name = ''.join(c for c in clean_field_name if c.isalnum() or c == '_')
                        
                        # Ensure the column exists (it should already exist as an entity attribute)
                        if clean_field_name and clean_field_name not in existing_columns:
                            try:
                                alter_stmt = sql.SQL("ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} TEXT;").format(
                                    table=sql.Identifier(entity_name),
                                    col=sql.Identifier(clean_field_name)
                                )
                                cur.execute(alter_stmt)
                                existing_columns.add(clean_field_name)
                                columns_added.append(clean_field_name)
                            except Exception as e:
                                print(f"Warning: Could not add column {clean_field_name} to {entity_name}: {str(e)}")
                
                if columns_added:
                    conn.commit()  # Commit the ALTER TABLE statements
                    print(f"Added {len(columns_added)} column(s) to entity table '{entity_name}': {columns_added}")

            # Serialize mappings and generate mapping_name
            serialized = {
                key: {"selector": fm.selector, "extract": fm.extract}
                for key, fm in em.field_mappings.items()
            }
            
            # Serialize follow_links if present
            follow_links_serialized = None
            if em.follow_links:
                follow_links_serialized = [
                    {
                        "name": fl.name,
                        "selector": fl.selector,
                        "field_mappings": {
                            key: {"selector": fm.selector, "extract": fm.extract}
                            for key, fm in fl.field_mappings.items()
                        }
                    }
                    for fl in em.follow_links
                ]
            
            mapping_name = f"{entity_name}-{mapping.source}-mapping"

            # Insert or update mapping with enabled status
            cur.execute("""
                INSERT INTO entity_mappings (entity_name, source_id, mapping_name, container_selector, field_mappings, follow_links, enabled)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (entity_name, source_id)
                DO UPDATE SET
                    container_selector = EXCLUDED.container_selector,
                    field_mappings = EXCLUDED.field_mappings,
                    follow_links = EXCLUDED.follow_links,
                    enabled = EXCLUDED.enabled,
                    created_at = NOW()
                RETURNING id;
            """, (entity_name, source_id, mapping_name, em.container_selector, Json(serialized), Json(follow_links_serialized) if follow_links_serialized else None, em.enabled))

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
    """Get all saved entity mappings. Uses LEFT JOIN to ensure broken mappings still show."""
    try:
        conn, cur = get_db_cursor()
        
        # Add column if missing (Safety check)
        cur.execute("ALTER TABLE entity_mappings ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;")
        cur.execute("UPDATE entity_mappings SET enabled = TRUE WHERE enabled IS NULL;")
        
        cur.execute("""
            SELECT em.id,
                   em.entity_name,
                   em.mapping_name,
                   em.container_selector,
                   em.field_mappings,
                   em.follow_links,
                   COALESCE(em.enabled, TRUE) as enabled,
                   em.created_at,
                   em.source_id,
                   COALESCE(s.name, 'Unknown Source') AS source_name,
                   COALESCE(s.url, '') AS source_url
            FROM entity_mappings em
            LEFT JOIN sources s ON em.source_id = s.id
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
                follow_links=row[5],
                enabled=row[6],
                created_at=row[7],
                source_id=row[8],
                source_name=row[9],
                url=row[10]
            ))
        
        cur.close()
        return MappingsListResponse(total_mappings=len(mappings), mappings=mappings)
        
    except Exception as e:
        print(f"Error fetching mappings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch mappings: {str(e)}")
    
@router.put("/edit-mapping/{mapping_name}", response_model=dict)
async def edit_mapping(mapping_name: str, payload: dict = Body(...)):
    """
    Edit an existing entity mapping.
    Maps source_name string to source_id integer automatically.
    """
    connection = None
    try:
        connection, cur = get_db_cursor()
        mapping_name = mapping_name.strip()
        
        # 1. Extract the actual data from the frontend's nested structure
        entity_list = payload.get("entity_mappings", [])
        if not entity_list:
            raise HTTPException(status_code=400, detail="No mapping data found in payload.")
        
        data = entity_list[0] 
        source_name = payload.get("source") # Example: "Google Maps"

        # 2. Convert Source Name back to Source ID
        cur.execute("SELECT id FROM sources WHERE name = %s", (source_name,))
        source_row = cur.fetchone()
        
        # Logic: If source exists, use ID. If not, keep current or set Null.
        source_id = source_row[0] if source_row else None

        # 3. Update the database
        cur.execute("""
            UPDATE entity_mappings
            SET container_selector = %s,
                field_mappings = %s,
                follow_links = %s,
                source_id = %s,
                enabled = %s
            WHERE mapping_name = %s;
        """, (
            data.get("container_selector"),
            Json(data.get("field_mappings", {})),
            Json(data.get("follow_links")) if data.get("follow_links") else None,
            source_id, 
            data.get("enabled", True),
            mapping_name
        ))

        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Mapping not found")

        connection.commit()
        return {"success": True, "message": f"Mapping '{mapping_name}' updated successfully."}

    except Exception as e:
        if connection: connection.rollback()
        print(f"Update failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if connection:
            cur.close()
            connection.close()


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