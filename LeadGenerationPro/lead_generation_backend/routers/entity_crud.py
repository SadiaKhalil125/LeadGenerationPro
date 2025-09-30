from fastapi import HTTPException, Query
from models import EntityRequest,  EntityInfo, EntitiesListResponse
from psycopg2 import sql
from fastapi import APIRouter
import os
from routers.get_db_connection import get_db_cursor

router = APIRouter()


# Map from your datatype names to PostgreSQL
TYPE_MAP = {
    "str": "TEXT",
    "string": "TEXT",
    "text": "TEXT",
    "int": "INTEGER",
    "integer": "INTEGER",
    "bool": "BOOLEAN",
    "boolean": "BOOLEAN",
    "float": "REAL",
    "real": "REAL",
    "decimal": "DECIMAL",
    "date": "DATE",
    "datetime": "TIMESTAMP",
    "timestamp": "TIMESTAMP"
}


@router.post("/save-entity", response_model=dict)
async def save_entity(request: EntityRequest):
    """Save a new entity configuration."""
    try:
        conn, cur = get_db_cursor()
        table_name = request.name.strip()
        if not table_name or not request.attributes:
            raise HTTPException(status_code=400, detail="Table name and attributes required.")

        # Build base columns
        cols = [sql.SQL("id SERIAL PRIMARY KEY")]
        cols.append(sql.SQL("modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
        cols.append(sql.SQL("source TEXT NULL"))

        # Track whether we’ve already added a "name" column
        name_column_added = False

        for attr in request.attributes:
            fname = attr.name.strip()
            dt = attr.datatype.strip().lower()

            if not fname or dt not in TYPE_MAP:
                raise HTTPException(status_code=400, detail=f"Invalid field or datatype: {dt}")

            # Normalize any "name-like" column to just 'name'
            if "name" in fname.lower():
                if name_column_added:
                    # Skip adding duplicate name-like column
                    continue
                fname = "name"
                name_column_added = True

            cols.append(
                sql.SQL("{} {}").format(
                    sql.Identifier(fname),
                    sql.SQL(TYPE_MAP[dt])
                )
            )

        # Add UNIQUE constraint at the end
        cols.append(sql.SQL("UNIQUE (source, name)"))

        # Create table
        create_stmt = sql.SQL("""
            CREATE TABLE IF NOT EXISTS {table} (
                {fields}
            );
        """).format(
            table=sql.Identifier(table_name),
            fields=sql.SQL(", ").join(cols)
        )
        cur.execute(create_stmt)
        conn.commit()
        cur.close()

        return {
            "success": True,
            "message": f"Entity '{table_name}' created successfully.",
            "table_name": table_name,
            "columns_created": len(cols)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create entity: {str(e)}")

    
@router.put("/edit-entity/{table_name}", response_model=dict)
async def edit_entity(table_name: str, request: EntityRequest):
    """Edit entity by adding new columns (SQL ALTER TABLE)."""
    try:
        conn, cur = get_db_cursor()
        table_name = table_name.strip()
        if not table_name or not request.attributes:
            raise HTTPException(status_code=400, detail="Table name and attributes required.")

        
        
        # Check if table exists
        cur.execute("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = %s)", (table_name,))
        if not cur.fetchone()[0]:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found.")

        # Add new columns
        added_cols = 0
        for attr in request.attributes:
            fname = attr.name.strip()
            dt = attr.datatype.strip().lower()
            
            if not fname or dt not in TYPE_MAP:
                continue
                
            try:
                alter_stmt = sql.SQL("ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {type};").format(
                    table=sql.Identifier(table_name),
                    col=sql.Identifier(fname),
                    type=sql.SQL(TYPE_MAP[dt])
                )
                cur.execute(alter_stmt)
                added_cols += 1
            except Exception:
                continue  # Skip if column already exists or other error

        conn.commit()
        cur.close()

        return {
            "success": True,
            "message": f"Entity '{table_name}' updated successfully.",
            "table_name": table_name,
            "columns_added": added_cols
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to edit entity: {str(e)}")

@router.delete("/delete-entity/{table_name}", response_model=dict)
async def delete_entity(table_name: str):
    """Delete entire entity (DROP TABLE)."""
    try:
        conn, cur = get_db_cursor()
        table_name = table_name.strip()
        if not table_name:
            raise HTTPException(status_code=400, detail="Table name required.")

        cur = conn.cursor()
        
        # Check if table exists
        cur.execute("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = %s)", (table_name,))
        if not cur.fetchone()[0]:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found.")

        # Drop table
        drop_stmt = sql.SQL("DROP TABLE {table};").format(table=sql.Identifier(table_name))
        cur.execute(drop_stmt)
        conn.commit()
        cur.close()

        return {
            "success": True,
            "message": f"Entity '{table_name}' deleted successfully.",
            "table_name": table_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete entity: {str(e)}")
    

@router.delete("/delete-column/{table_name}/{column_name}", response_model=dict)
async def delete_column(table_name: str, column_name: str):
    """Delete a specific column from entity (ALTER TABLE DROP COLUMN)."""
    try:
        conn, cur = get_db_cursor()
        table_name = table_name.strip()
        column_name = column_name.strip()
        
        if not table_name or not column_name:
            raise HTTPException(status_code=400, detail="Table name and column name required.")
        
        if column_name == "id":
            raise HTTPException(status_code=400, detail="Cannot delete primary key column 'id'.")

        
        
        # Check if table exists
        cur.execute("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = %s)", (table_name,))
        if not cur.fetchone()[0]:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found.")

        # Check if column exists
        cur.execute("""
            SELECT EXISTS(SELECT 1 FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s)
        """, (table_name, column_name))
        if not cur.fetchone()[0]:
            raise HTTPException(status_code=404, detail=f"Column '{column_name}' not found in table '{table_name}'.")

        # Drop column
        drop_stmt = sql.SQL("ALTER TABLE {table} DROP COLUMN {col};").format(
            table=sql.Identifier(table_name),
            col=sql.Identifier(column_name)
        )
        cur.execute(drop_stmt)
        conn.commit()
        cur.close()

        return {
            "success": True,
            "message": f"Column '{column_name}' deleted from '{table_name}' successfully.",
            "table_name": table_name,
            "column_deleted": column_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete column: {str(e)}")

@router.put("/rename-column/{table_name}/{old_name}/{new_name}", response_model=dict)
async def rename_column(table_name: str, old_name: str, new_name: str):
    """Rename a column in the specified table."""
    try:
        conn, cur = get_db_cursor()
        rename_stmt = sql.SQL("ALTER TABLE {table} RENAME COLUMN {old_col} TO {new_col};").format(
            table=sql.Identifier(table_name),
            old_col=sql.Identifier(old_name),
            new_col=sql.Identifier(new_name)
        )
        cur.execute(rename_stmt)
        conn.commit()
        cur.close()
        
        return {
            "success": True,
            "message": f"Column '{old_name}' renamed to '{new_name}' successfully.",
            "table_name": table_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rename column: {str(e)}")

@router.get("/entity-info/{table_name}", response_model=dict)
async def get_entity_info(table_name: str):
    """Get information about an entity (table structure)."""
    try:
        conn, cur = get_db_cursor()
        table_name = table_name.strip()
        if not table_name:
            raise HTTPException(status_code=400, detail="Table name required.")

        
        
        # Check if table exists and get column info
        cur.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = %s 
            ORDER BY ordinal_position
        """, (table_name,))
        
        columns = cur.fetchall()
        if not columns:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found.")

        # Get row count
        cur.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table_name)))
        row_count = cur.fetchone()[0]
        cur.close()

        return {
            "success": True,
            "table_name": table_name,
            "columns": [{"name": col[0], "type": col[1], "nullable": col[2]} for col in columns],
            "column_count": len(columns),
            "row_count": row_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entity info: {str(e)}")

@router.get("/entities", response_model=EntitiesListResponse)
async def get_all_entities():
    """
    Get all saved entities (tables) with their column information.
    """
    try:
        conn, cur = get_db_cursor()
        
        
        # Get all user-created tables (excluding system tables)
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name NOT IN ('entity_mappings','sources','tasks')
            ORDER BY table_name
        """)
        
        table_names = [row[0] for row in cur.fetchall()]
        entities = []
        
        for table_name in table_names:
            # Get columns for each table
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s 
                AND table_schema = 'public'
                ORDER BY ordinal_position
            """, (table_name,))
            
            columns = [row[0] for row in cur.fetchall()]
            
            entities.append(EntityInfo(
                name=table_name,
                columns=columns
            ))
        
        cur.close()
        
        return EntitiesListResponse(
            total_entities=len(entities),
            entities=entities
        )
        
    except Exception as e:
        print(f"Error fetching entities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch entities: {str(e)}")
    

@router.get("/entity-data/{table_name}", response_model=dict)
async def get_entity_data(
    table_name: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    """
    Fetch data from the given entity/table with pagination.
    page: 1-based page number
    page_size: number of rows per page
    """
    try:
        conn, cur = get_db_cursor()
        table_name = table_name.strip()
        if not table_name:
            raise HTTPException(status_code=400, detail="Table name required.")

        # Check if table exists
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s
        """, (table_name,))
        columns = [row[0] for row in cur.fetchall()]
        if not columns:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found.")

        offset = (page - 1) * page_size

        # Fetch paginated data
        query = sql.SQL("SELECT * FROM {} ORDER BY modified_at DESC LIMIT %s OFFSET %s").format(
            sql.Identifier(table_name)
        )
        cur.execute(query, (page_size, offset))
        rows = cur.fetchall()

        cur.close()

        return {
            "success": True,
            "table_name": table_name,
            "columns": columns,
            "page": page,
            "page_size": page_size,
            "rows": rows,
            "row_count": len(rows)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entity data: {str(e)}")
