from fastapi import FastAPI, HTTPException
from bs4 import BeautifulSoup
from datetime import datetime
import asyncio
from models import SourceInfo, SourcesListResponse, FieldMapping, ScrapeRequest, ScrapeResponse, EntityRequest, EntityMappingRequest, EntityInfo, EntitiesListResponse, Attribute, MappingsListResponse, MappingInfo, MappingFormRequest, TaskInfo,TaskRequest,TasksListResponse, TaskUpdateRequest
from utils import extract_value, fetch_page
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys
from crawl4Util import extract_website
import asyncio
from asyncio import WindowsProactorEventLoopPolicy  # For proper subprocess support on Windows
import psycopg2
import os
import json
from psycopg2.extras import Json
from psycopg2 import sql
from urllib.parse import urlparse


# 1. Set the event loop policy before any async operations
if sys.platform == "win32":
    asyncio.set_event_loop_policy(WindowsProactorEventLoopPolicy())


# 2. Database connection setup
DB_NAME = os.getenv("DB_NAME", "LeadGenerationPro")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "9042c98a")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

conn = psycopg2.connect(
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASS,
    host=DB_HOST,
    port=DB_PORT
)
cur = conn.cursor()
# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Dynamic Web Scraper API",
    description="A flexible web scraper that accepts entity configurations at runtime",
    version="1.0.0"
)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.post("/scrapedynamic", response_model=ScrapeResponse)
def scrape_dynamic(request: ScrapeRequest):
    try:
        response = asyncio.run(extract_website(request))
        return response
    except Exception as e:
        logger.error("Error during dynamic scraping", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scraping error: {e}")

@app.post("/scrapestatic", response_model=ScrapeResponse)
async def scrape_website(request: ScrapeRequest):
    """
    Scrape a website based on the provided entity configuration
    
    Example request:
    ```json
    {
        "entity_name": "business_listings",
        "url": "https://www.hotfrog.com/search/usa/business-networking",
        "container_selector": ".col-8",
        "field_mappings": {
            "company_name": {"selector": "h3 strong", "extract": "text"},
            "company_link": {"selector": "h3 a", "extract": "href"},
            "address": {"selector": "span.small:nth-child(2)", "extract": "text"},
            "description": {"selector": "p.mb-0", "extract": "text"}
        },
        "max_items": 50
    }
    ```
    """
    
    try:
        # Fetch and parse the page
        soup = await fetch_page(request.url, request.timeout)
        
        # Extract data
        data = []
        
        if request.container_selector:
            # Multiple items scenario
            containers = soup.select(request.container_selector)
            
            if not containers:
                return ScrapeResponse(
                    entity_name=request.entity_name,
                    url=str(request.url),
                    scraped_at=datetime.now(),
                    total_items=0,
                    data=[],
                    success=False,
                    message=f"No containers found with selector: {request.container_selector}"
                )
            
            # Limit items if max_items is specified
            if request.max_items:
                containers = containers[:request.max_items]
            
            for i, container in enumerate(containers, 1):
                row = {"index": i}
                
                for field_name, mapping in request.field_mappings.items():
                    element = container.select_one(mapping.selector)
                    row[field_name] = extract_value(element, mapping.extract)
                
                # Only add row if it has some non-empty values
                if any(v for k, v in row.items() if k != "index" and v):
                    data.append(row)
        
        else:
            # Single item scenario
            row = {}
            
            for field_name, mapping in request.field_mappings.items():
                element = soup.select_one(mapping.selector)
                row[field_name] = extract_value(element, mapping.extract)
            
            # Only add if has some non-empty values
            if any(row.values()):
                data.append(row)
        
        return ScrapeResponse(
            entity_name=request.entity_name,
            url=str(request.url),
            scraped_at=datetime.now(),
            total_items=len(data),
            data=data,
            success=True,
            message=f"Successfully scraped {len(data)} {request.entity_name} items"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")


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
@app.post("/save-entity", response_model=dict)
async def save_entity(request: EntityRequest):
    """Save a new entity configuration."""
    try:
        table_name = request.name.strip()
        if not table_name or not request.attributes:
            raise HTTPException(status_code=400, detail="Table name and attributes required.")

        # Build columns
        cols = [sql.SQL("id SERIAL PRIMARY KEY")]
        for attr in request.attributes:
            fname = attr.name.strip()
            dt = attr.datatype.strip().lower()
            
            if not fname or dt not in TYPE_MAP:
                raise HTTPException(status_code=400, detail=f"Invalid field or datatype: {dt}")
            
            cols.append(sql.SQL("{} {}").format(
                sql.Identifier(fname),
                sql.SQL(TYPE_MAP[dt])
            ))

        # Create table
        cur = conn.cursor()
        create_stmt = sql.SQL("CREATE TABLE IF NOT EXISTS {table} ( {fields} );").format(
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


@app.put("/edit-entity/{table_name}", response_model=dict)
async def edit_entity(table_name: str, request: EntityRequest):
    """Edit entity by adding new columns (SQL ALTER TABLE)."""
    try:
        table_name = table_name.strip()
        if not table_name or not request.attributes:
            raise HTTPException(status_code=400, detail="Table name and attributes required.")

        cur = conn.cursor()
        
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


@app.delete("/delete-entity/{table_name}", response_model=dict)
async def delete_entity(table_name: str):
    """Delete entire entity (DROP TABLE)."""
    try:
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


@app.delete("/delete-column/{table_name}/{column_name}", response_model=dict)
async def delete_column(table_name: str, column_name: str):
    """Delete a specific column from entity (ALTER TABLE DROP COLUMN)."""
    try:
        table_name = table_name.strip()
        column_name = column_name.strip()
        
        if not table_name or not column_name:
            raise HTTPException(status_code=400, detail="Table name and column name required.")
        
        if column_name == "id":
            raise HTTPException(status_code=400, detail="Cannot delete primary key column 'id'.")

        cur = conn.cursor()
        
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

@app.put("/rename-column/{table_name}/{old_name}/{new_name}", response_model=dict)
async def rename_column(table_name: str, old_name: str, new_name: str):
    """Rename a column in the specified table."""
    try:
        cur = conn.cursor()
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

@app.get("/entity-info/{table_name}", response_model=dict)
async def get_entity_info(table_name: str):
    """Get information about an entity (table structure)."""
    try:
        table_name = table_name.strip()
        if not table_name:
            raise HTTPException(status_code=400, detail="Table name required.")

        cur = conn.cursor()
        
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







def generate_mapping_name(entity_name: str, url: str) -> str:
    # Always parse a plain string
    host = (urlparse(str(url)).hostname or "unknown").split('.')[0]
    return f"{entity_name}_{host}_mapping".lower()

@app.post("/save-source", response_model=dict)
async def save_source(name: str, url: str):
    """Save a website source in 'sources' table or reuse if it already exists."""
    cur = conn.cursor()
    try:
        name = name.strip()
        url = url.strip()
        if not name or not url:
            raise HTTPException(status_code=400, detail="Source name and URL required.")

        # 1️⃣ Ensure table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sources (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                url TEXT NOT NULL
            );
        """)

        # 2️⃣ Check if source already exists (reuse if found)
        cur.execute("SELECT id FROM sources WHERE name = %s;", (name,))
        existing = cur.fetchone()
        if existing:
            existing_id = existing[0]
            return {
                "success": True,
                "id": existing_id,
                "message": f"Source '{name}' already exists—reusing it."
            }

        # 3️⃣ Insert a new source
        cur.execute(
            "INSERT INTO sources (name, url) VALUES (%s, %s) RETURNING id;",
            (name, url)
        )
        new_id = cur.fetchone()[0]
        conn.commit()

        return {"success": True, "id": new_id, "message": f"Source '{name}' saved successfully."}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save source: {str(e)}")
    finally:
        cur.close()


@app.post("/save-entity-mapping", response_model=dict)
async def save_entity_mapping(mapping: MappingFormRequest):
    """
    Save scraping configurations for one or more entities against one source.
    Steps:
    1. Ensure the source is saved.
    2. For each entity mapping:
       - Validate entity table exists.
       - Validate mapping field keys match table columns.
       - Save mapping linked to source_id.
    """

    cur = conn.cursor()
    try:
        # Normalize URL before inserting
        normalized_url = str(mapping.url)
        if normalized_url and not normalized_url.startswith(('http://', 'https://')):
            normalized_url = f'https://{normalized_url}'

        # Save/verify the source → returns source_id
        source_result = await save_source(mapping.source, normalized_url)
        source_id = source_result.get("id")
        if not source_id:
            raise HTTPException(status_code=500, detail="Failed to retrieve source_id.")

        # Ensure entity_mappings table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS entity_mappings (
                id SERIAL PRIMARY KEY,
                entity_name TEXT NOT NULL,
                source_id INT REFERENCES sources(id) ON DELETE CASCADE,
                mapping_name TEXT NOT NULL UNIQUE,
                container_selector TEXT,
                field_mappings JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT unique_entity_source UNIQUE (entity_name, source_id)
            );
        """)

        saved_mappings = []

        # Process each entity mapping in the request
        for em in mapping.entity_mappings:
            entity_name = em.entity_name.strip()
            if not entity_name:
                raise HTTPException(status_code=400, detail="Entity name cannot be empty.")

            if not em.field_mappings:
                raise HTTPException(status_code=400, detail=f"No field mappings for {entity_name}.")

            #  Check entity table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables WHERE table_name = %s
                )
            """, (entity_name,))
            if not cur.fetchone()[0]:
                raise HTTPException(status_code=400, detail=f"Entity table '{entity_name}' does not exist.")

            #  Validate field mapping keys
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s", (entity_name,))
            existing_columns = {row[0] for row in cur.fetchall()}
            invalid = [field for field in em.field_mappings.keys() if field not in existing_columns]
            if invalid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid fields {invalid} for '{entity_name}'. Valid columns: {sorted(existing_columns)}"
                )

            #  Serialize mappings and generate mapping_name
            serialized = {
                key: {"selector": fm.selector, "extract": fm.extract}
                for key, fm in em.field_mappings.items()
            }
            mapping_name = f"{entity_name}-{mapping.source}-mapping"  # Simple unique name pattern


            # 💾 Insert or update mapping
            cur.execute("""
                INSERT INTO entity_mappings (entity_name, source_id, mapping_name, container_selector, field_mappings)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (entity_name, source_id)
                DO UPDATE SET
                    container_selector = EXCLUDED.container_selector,
                    field_mappings = EXCLUDED.field_mappings,
                    created_at = NOW()
                RETURNING id;
            """, (entity_name, source_id, mapping_name, em.container_selector, Json(serialized)))

            mapping_id = cur.fetchone()[0]
            saved_mappings.append({
                "mapping_name": mapping_name
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
        

@app.get("/entities", response_model=EntitiesListResponse)
async def get_all_entities():
    """
    Get all saved entities (tables) with their column information.
    """
    try:
        cur = conn.cursor()
        
        # Get all user-created tables (excluding system tables)
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name NOT IN ('entity_mappings','sources')
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

@app.get("/mappings", response_model=MappingsListResponse)
async def get_all_mappings():
    """
    Get all saved entity mappings.
    """
    try:
        cur = conn.cursor()
        
        # Get all mappings
        
        cur.execute("""
            SELECT em.id,
           em.entity_name,
           em.mapping_name,
           em.container_selector,
           em.field_mappings,
           em.created_at,
           em.source_id,
           s.name AS source_name,
           s.url  AS source_url
    FROM entity_mappings em
    JOIN sources s
      ON em.source_id = s.id
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
                field_mappings=row[4],  # This is already a dict from JSONB
                created_at=row[5],
                source_id=row[6],
                source_name=row[7],
                url=row[8]  # source_url

            ))
        
        cur.close()
        
        return MappingsListResponse(
            total_mappings=len(mappings),
            mappings=mappings
        )
        
    except Exception as e:
        print(f"Error fetching mappings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch mappings: {str(e)}")
    
@app.delete("/delete-mapping/{mapping_name}", response_model=dict)
async def delete_mapping(mapping_name: str):
    """
    Delete an entity mapping by its mapping_name.
    """
    try:
        mapping_name = mapping_name.strip()
        if not mapping_name:
            raise HTTPException(status_code=400, detail="Mapping name is required.")

        cur = conn.cursor()

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

    
@app.get("/sources", response_model=SourcesListResponse)
async def get_all_sources():
    """
    Get all saved website sources.
    """
    try:
        cur = conn.cursor()
        # 🗃 Fetch all sources sorted by creation order (id descending for newest first)
        cur.execute("""
            SELECT id, name, url
            FROM sources
            ORDER BY id DESC;
        """)
        rows = cur.fetchall()
        cur.close()

        # 📋 Convert rows into response objects
        sources = []
        for row in rows:
            sources.append(SourceInfo(
                id=row[0],
                name=row[1],
                url=row[2]
            ))

        return SourcesListResponse(
            total_sources=len(sources),
            sources=sources
        )

    except Exception as e:
        print(f"Error fetching sources: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sources: {str(e)}")


@app.post("/create-task", response_model=dict)
async def create_task(request: TaskRequest):
    """Create a scheduled scraping task."""
    try:
        cur = conn.cursor()
        
        # Create tasks table if it doesn't exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                task_name TEXT UNIQUE NOT NULL,
                source_id INT REFERENCES sources(id) ON DELETE CASCADE,
                mapping_id INT REFERENCES entity_mappings(id) ON DELETE CASCADE,
                scheduled_time TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT unique_task_mapping UNIQUE (source_id, mapping_id, scheduled_time)
            );
        """)
        
        # Verify source exists
        cur.execute("SELECT id FROM sources WHERE id = %s", (request.source_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Source not found")
        
        # Verify mapping exists and belongs to the source, get mapping details
        cur.execute("""
            SELECT id, mapping_name, entity_name 
            FROM entity_mappings 
            WHERE id = %s AND source_id = %s
        """, (request.mapping_id, request.source_id))
        
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Mapping not found for the specified source")
            
        mapping_id, mapping_name, entity_name = result
        
        # Generate unique task name if not provided
        task_name = request.task_name
        if not task_name:
            timestamp = request.scheduled_time.strftime("%Y%m%d_%H%M%S")
            task_name = f"{entity_name}_{mapping_name}_{timestamp}"
            
        # Ensure task name is unique
        counter = 1
        original_task_name = task_name
        while True:
            cur.execute("SELECT id FROM tasks WHERE task_name = %s", (task_name,))
            if not cur.fetchone():
                break
            task_name = f"{original_task_name}_{counter}"
            counter += 1
        
        # Insert task
        cur.execute("""
            INSERT INTO tasks (task_name, source_id, mapping_id, scheduled_time)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (task_name, request.source_id, request.mapping_id, request.scheduled_time))
        
        task_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        
        return {
            "success": True,
            "task_id": task_id,
            "task_name": task_name,
            "message": f"Task '{task_name}' created successfully"
        }
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

@app.get("/tasks", response_model=TasksListResponse)
async def get_all_tasks():
    """Get all scheduled tasks with their details."""
    try:
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                t.id,
                t.task_name,
                t.source_id,
                s.name as source_name,
                t.mapping_id,
                em.mapping_name,
                em.entity_name,
                t.scheduled_time,
                t.created_at
            FROM tasks t
            JOIN sources s ON t.source_id = s.id
            JOIN entity_mappings em ON t.mapping_id = em.id
            ORDER BY t.scheduled_time DESC
        """)
        
        rows = cur.fetchall()
        tasks = []
        
        for row in rows:
            tasks.append(TaskInfo(
                id=row[0],
                task_name=row[1],
                source_id=row[2],
                source_name=row[3],
                mapping_id=row[4],
                mapping_name=row[5],
                entity_name=row[6],
                scheduled_time=row[7],
                created_at=row[8]
            ))
        
        cur.close()
        
        return TasksListResponse(
            total_tasks=len(tasks),
            tasks=tasks
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tasks: {str(e)}")

@app.get("/mappings-by-source/{source_id}")
async def get_mappings_by_source(source_id: int):
    """Get all mappings for a specific source by ID."""
    try:
        cur = conn.cursor()
        
        cur.execute("""
            SELECT em.id, em.mapping_name, em.entity_name, em.container_selector
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
                "container_selector": row[3]
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

@app.delete("/delete-task/{task_id}", response_model=dict)
async def delete_task(task_id: int):
    """Delete a scheduled task."""
    try:
        cur = conn.cursor()
        
        # Check if task exists
        cur.execute("SELECT task_name FROM tasks WHERE id = %s", (task_id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task_name = result[0]
        
        # Delete task
        cur.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        conn.commit()
        cur.close()
        
        return {
            "success": True,
            "message": f"Task '{task_name}' deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")
    
# Add this endpoint to your main.py file
@app.put("/update-task/{task_id}", response_model=dict)
async def update_task(task_id: int, request: TaskUpdateRequest):
    """Update a task's scheduled time and optionally its name."""
    try:
        cur = conn.cursor()
        
        # Check if task exists
        cur.execute("SELECT task_name FROM tasks WHERE id = %s", (task_id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Task not found")
        
        current_task_name = result[0]
        
        # Use provided task name or keep current one
        new_task_name = request.task_name if request.task_name else current_task_name
        
        # If task name is being changed, ensure it's unique
        if request.task_name and request.task_name != current_task_name:
            counter = 1
            original_task_name = new_task_name
            while True:
                cur.execute("SELECT id FROM tasks WHERE task_name = %s AND id != %s", (new_task_name, task_id))
                if not cur.fetchone():
                    break
                new_task_name = f"{original_task_name}_{counter}"
                counter += 1
        
        # Update task
        cur.execute("""
            UPDATE tasks 
            SET scheduled_time = %s, task_name = %s
            WHERE id = %s
        """, (request.scheduled_time, new_task_name, task_id))
        
        conn.commit()
        cur.close()
        
        return {
            "success": True,
            "message": f"Task '{new_task_name}' updated successfully",
            "task_name": new_task_name
        }
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update task: {str(e)}")
    
@app.get("/")
async def root():
    return {
        "message": "Dynamic Web Scraper API",
        "docs": "/docs",
        "endpoints": {
            "POST /scrape": "Scrape a website with dynamic configuration",
            "POST /scrape/test-selectors": "Test CSS selectors before scraping"
        }
    }
