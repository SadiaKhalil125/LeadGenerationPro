from fastapi import FastAPI, HTTPException
from bs4 import BeautifulSoup
from datetime import datetime
import asyncio
from models import FieldMapping, ScrapeRequest, ScrapeResponse, EntityRequest, EntityMappingRequest, EntityInfo, EntitiesListResponse, Attribute, MappingsListResponse, MappingInfo
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

@app.post("/save-entity-mapping", response_model=dict)
async def save_entity_mapping(mapping: EntityMappingRequest):

    """
    Save a scraping configuration (EntityMapping) for a website.
    Ensures:
    - The referenced entity table already exists.
    - Field mapping keys match the table's columns.
    """

    try:
        if not mapping.entity_name.strip():
            raise HTTPException(status_code=400, detail="Entity name cannot be empty.")
        if not mapping.field_mappings:
            raise HTTPException(status_code=400, detail="At least one field mapping is required.")

        cur = conn.cursor()

        # Check if the entity table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = %s
            )
        """, (mapping.entity_name,))
        if not cur.fetchone()[0]:
            raise HTTPException(status_code=400, detail=f"Entity table '{mapping.entity_name}' does not exist.")

        # ✅ Get column names of the entity table
        cur.execute(sql.SQL("SELECT column_name FROM information_schema.columns WHERE table_name = %s"), 
                    (mapping.entity_name,))
        existing_columns = {row[0] for row in cur.fetchall()}  # set of column names

        # ✅ Validate all mapping field names exist as columns (ignore id)
        invalid = [field for field in mapping.field_mappings.keys() if field not in existing_columns]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid field mappings: {invalid}. Valid columns: {sorted(existing_columns)}"
            )
        
        mapping_name = generate_mapping_name(mapping.entity_name, mapping.url)

        serialized_mappings= {
            key: {"selector": fm.selector, "extract": fm.extract}
            for key, fm in mapping.field_mappings.items()
        }

        # Create table for mappings if it doesn't exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS entity_mappings (
                id SERIAL PRIMARY KEY,
                entity_name TEXT NOT NULL,
                url TEXT NOT NULL,
                mapping_name TEXT NOT NULL, 
                container_selector TEXT,
                field_mappings JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT unique_entity_url UNIQUE (entity_name, url),
                CONSTRAINT unique_mapping_name UNIQUE (mapping_name)
            )
        """)

        # Insert the new mapping
        cur.execute(
            """
            INSERT INTO entity_mappings (entity_name, url, mapping_name, container_selector, field_mappings)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (entity_name, url) 
            DO UPDATE SET
                container_selector = EXCLUDED.container_selector,
                field_mappings = EXCLUDED.field_mappings,
                created_at = NOW()
            RETURNING id
            """,
            (mapping.entity_name, str(mapping.url), mapping_name, mapping.container_selector, Json(serialized_mappings))
        )

        mapping_id = cur.fetchone()[0]
        conn.commit()
        cur.close()

        return {
            "message": f"Entity mapping for '{mapping.entity_name}' on '{mapping.url}' saved successfully.",
            "mapping_name": mapping_name
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error saving entity mapping: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save mapping: {str(e)}")


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
            AND table_name NOT IN ('entity_mappings')
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
            SELECT id, entity_name, url, mapping_name, container_selector, field_mappings, created_at
            FROM entity_mappings 
            ORDER BY created_at DESC
        """)
        
        rows = cur.fetchall()
        mappings = []
        
        for row in rows:
            mappings.append(MappingInfo(
                id=row[0],
                entity_name=row[1],
                url=row[2],
                mapping_name=row[3],
                container_selector=row[4],
                field_mappings=row[5],  # This is already a dict from JSONB
                created_at=row[6]
            ))
        
        cur.close()
        
        return MappingsListResponse(
            total_mappings=len(mappings),
            mappings=mappings
        )
        
    except Exception as e:
        print(f"Error fetching mappings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch mappings: {str(e)}")
    

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
