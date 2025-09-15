from fastapi import FastAPI, HTTPException
from bs4 import BeautifulSoup
from datetime import datetime
import asyncio
from .models import FieldMapping, ScrapeRequest, ScrapeResponse, EntityRequest, EntityMappingRequest
from .utils import extract_value, fetch_page
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys
from .crawl4Util import extract_website
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
DB_NAME = os.getenv("DB_NAME", "LeadGen")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "hannia")
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
    """
    Save a new entity configuration.
    Example request:
    {
        "name": "business_listings",
        "attributes": [
            {"name": "company_name", "datatype": "str"},
            {"name": "company_link", "datatype": "str"},
            {"name": "address", "datatype": "str"},
            {"name": "description", "datatype": "str"}
        ]
    }
    """
    try:
        table_name = request.name.strip()
        if not table_name:
            raise HTTPException(status_code=400, detail="Table name cannot be empty.")

        # Validate attribute list
        if not request.attributes:
            raise HTTPException(status_code=400, detail="At least one attribute must be provided.")

        # Build column definitions
        cols = []
        for attr in request.attributes:
            fname = attr.name.strip()  # Fixed: using 'name' instead of 'field_name'
            dt = attr.datatype.strip().lower()
            
            if not fname:
                raise HTTPException(status_code=400, detail="Field name cannot be empty.")
            
            if dt not in TYPE_MAP:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unsupported datatype: {attr.datatype}. Supported types: {list(TYPE_MAP.keys())}"
                )
            
            pg_type = TYPE_MAP[dt]
            # Build an SQL snippet for the column: "field_name datatype"
            cols.append(sql.SQL("{} {}").format(
                sql.Identifier(fname),
                sql.SQL(pg_type)
            ))

        # Always include id primary key
        id_col = sql.SQL("id SERIAL PRIMARY KEY")

        # Combine all columns
        all_columns = [id_col] + cols

        # Create database cursor
        cur = conn.cursor()
        
        # Construct CREATE TABLE IF NOT EXISTS with safe identifiers
        create_stmt = sql.SQL("CREATE TABLE IF NOT EXISTS {table} ( {fields} );").format(
            table=sql.Identifier(table_name),
            fields=sql.SQL(", ").join(all_columns)
        )
        
        # Execute the statement
        cur.execute(create_stmt)
        conn.commit()  # Don't forget to commit the transaction
        cur.close()

        return {
            "message": f"Entity (table) '{table_name}' created successfully.",
            "table_name": table_name,
            "columns_created": len(cols) + 1  # +1 for id column
        }

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error and raise HTTP exception
        print(f"Error creating entity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create entity: {str(e)}")



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
