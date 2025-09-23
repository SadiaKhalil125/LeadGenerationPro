from fastapi import HTTPException
from datetime import datetime
import asyncio
from models import SourceInfo, SourcesListResponse
from utils import extract_value, fetch_page
import asyncio
from fastapi import APIRouter
from .get_db_connection import get_db_cursor

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
            SELECT id, name, url
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
                url=row[2]
            ))

        return SourcesListResponse(
            total_sources=len(sources),
            sources=sources
        )

    except Exception as e:
        print(f"Error fetching sources: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sources: {str(e)}")

@router.post("/save-source", response_model=dict)
async def save_source(name: str, url: str):
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
                url TEXT NOT NULL
            );
        """)

        # 2 Check if source already exists (reuse if found)
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

