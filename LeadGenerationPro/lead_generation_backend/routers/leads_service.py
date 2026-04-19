# leads_schema.py
from datetime import datetime
import os
import sys

from psycopg2 import sql
from routers.get_db_connection import get_db_cursor

# routers/leads_sync.py
from fastapi import APIRouter, HTTPException, Query, Path
from typing import Dict, Optional, List

# leads_normalization.py
import hashlib

from pydantic import BaseModel

# Add this model
class SyncRequest(BaseModel):
    entity_tables: List[str]
    batch_size: int = 500

# Response models
class LeadInfo(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    source: Optional[str] = None
    source_entity: Optional[str] = None
    created_at: datetime
    company_name: Optional[str] = None


router = APIRouter()

def ensure_leads_table():
    conn, cur = get_db_cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id SERIAL PRIMARY KEY,

            name TEXT,
            address TEXT,
            phone TEXT,
            email TEXT,
            website TEXT,

            rating REAL,
            reviews_count INTEGER,

            category TEXT,
            hours TEXT,
            description TEXT,

            source TEXT,
            source_entity TEXT,
            source_entity_id INTEGER,

            unique_hash TEXT UNIQUE,
            last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    conn.commit()
    cur.close()



FIELD_MAPPINGS = {
    'name': ['name', 'businessname', 'placename', 'title', 'company_name'],
    'address': ['address', 'location', 'streetaddress', 'fulladdress', 'addr', 'place'],
    'phone': ['phone', 'phonenumber', 'contact', 'telephone', 'tel', 'mobile', 'contactnumber'],
    'email': ['email', 'emailaddress', 'mail'],
    'website': ['website', 'url', 'web', 'site', 'link', 'portfolio'],
    'rating': ['rating', 'reviewsaverage', 'averagerating', 'score', 'stars'],
    'reviews_count': ['reviewscount', 'reviewcount', 'totalreviews', 'numberofreviews', 'numreviews'],
    'category': ['category', 'type', 'placetype', 'businesstype', 'kind', 'sector', 'industry'],
    'hours': ['hours', 'opensat', 'openinghours', 'businesshours', 'timing'],
    'description': ['description', 'introduction', 'about', 'overview', 'summary', 'details', 'info', 'information', 'bio', 'background', 'aboutus'],
}

def normalize_row(row: dict):
    normalized = {}
    lower_row = {k.lower(): v for k, v in row.items()}

    for target, aliases in FIELD_MAPPINGS.items():
        for alias in aliases:
            if alias in lower_row and lower_row[alias]:
                normalized[target] = lower_row[alias]
                break
        else:
            normalized[target] = None

    return normalized

def compute_unique_hash(name, phone, email, address):
    raw = f"{name or ''}|{phone or ''}|{email or ''}|{address or ''}"
    return hashlib.sha256(raw.strip().lower().encode()).hexdigest()



@router.post("/leads/sync")
async def sync_leads(request: SyncRequest):  # Change parameter
    """
    Normalize entity tables into unified leads table.
    Safe to re-run.
    """
    # Extract from request
    entity_tables = request.entity_tables
    batch_size = request.batch_size
    
    if not entity_tables:
        raise HTTPException(status_code=400, detail="entity_tables required")

    print("[LEADS_SYNC] Starting leads sync")
    print(f"[LEADS_SYNC] Tables: {entity_tables}")
    print(f"[LEADS_SYNC] Batch size: {batch_size}")
    try:
        ensure_leads_table()
        print("[LEADS_SYNC] Leads table ensured")

        conn, cur = get_db_cursor()
        total_processed = 0
        total_upserted = 0

        for table in entity_tables:
            table = table.strip()
            print(f"[LEADS_SYNC] Processing table: {table}")

            try:
                # --- get columns ---
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = %s
                """, (table,))
                columns = [c[0] for c in cur.fetchall()]

                if not columns:
                    print(f"[LEADS_SYNC] No columns found for table '{table}', skipping")
                    continue

                offset = 0

                while True:
                    query = sql.SQL("""
                        SELECT *
                        FROM {table}
                        ORDER BY id
                        LIMIT %s OFFSET %s
                    """).format(table=sql.Identifier(table))

                    cur.execute(query, (batch_size, offset))
                    rows = cur.fetchall()

                    if not rows:
                        print(f"[LEADS_SYNC] No more rows in '{table}'")
                        break

                    print(f"[LEADS_SYNC] Fetched {len(rows)} rows from '{table}' (offset {offset})")

                    for row in rows:
                        try:
                            row_dict = dict(zip(columns, row))
                            normalized = normalize_row(row_dict)

                            unique_hash = compute_unique_hash(
                                normalized.get("name"),
                                normalized.get("phone"),
                                normalized.get("email"),
                                normalized.get("address")
                            )

                            insert_stmt = sql.SQL("""
                                INSERT INTO leads (
                                    name, address, phone, email, website,
                                    rating, reviews_count, category, hours, description,
                                    source, source_entity, source_entity_id,
                                    unique_hash, last_modified_at
                                )
                                VALUES (
                                    %(name)s, %(address)s, %(phone)s, %(email)s, %(website)s,
                                    %(rating)s, %(reviews_count)s, %(category)s, %(hours)s, %(description)s,
                                    %(source)s, %(source_entity)s, %(source_entity_id)s,
                                    %(unique_hash)s, CURRENT_TIMESTAMP
                                )
                                ON CONFLICT (unique_hash)
                                DO UPDATE SET
                                    last_modified_at = CURRENT_TIMESTAMP
                            """)

                            cur.execute(insert_stmt, {
                                **normalized,
                                "source": row_dict.get("source"),
                                "source_entity": table,
                                "source_entity_id": row_dict.get("id"),
                                "unique_hash": unique_hash
                            })

                            total_upserted += 1

                        except Exception as row_err:
                            print(f"[LEADS_SYNC][ROW_ERROR] Table '{table}', Row ID {row_dict.get('id')}: {row_err}")
                            conn.rollback()
                            continue

                    conn.commit()
                    total_processed += len(rows)
                    offset += batch_size

            except Exception as table_err:
                print(f"[LEADS_SYNC][TABLE_ERROR] Failed processing table '{table}': {table_err}")
                conn.rollback()
                continue

        cur.close()
        print("[LEADS_SYNC] Sync completed successfully")

        return {
            "success": True,
            "tables_processed": entity_tables,
            "rows_processed": total_processed,
            "rows_upserted": total_upserted
        }

    except Exception as e:
        print(f"[LEADS_SYNC][FATAL] Sync failed: {e}")
        try:
            conn.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Leads sync failed: {str(e)}")


@router.get("/leads/search")
async def search_leads(
    business_type: str = Query(..., description="Industry / business type"),
    location: str = Query(..., description="City, state, or country"),
    company_size: Optional[str] = Query(None, description="Ignored for now"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Search leads by:
    - Business Type (category)
    - Location (partial match on address)

    Company size is accepted but currently ignored.
    """

    try:
        conn, cur = get_db_cursor()

        query = """
            SELECT
                id,
                name,
                category,
                address,
                phone,
                email,
                website,
                rating,
                reviews_count,
                source,
                source_entity,
                created_at
            FROM leads
            WHERE
                LOWER(TRIM(category)) LIKE LOWER(TRIM(%s))
                OR
                LOWER(TRIM(address)) LIKE LOWER(TRIM(%s))
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """

        bt = f"%{business_type.strip().lower()}%"
        loc = f"%{location.strip().lower()}%"
        
        cur.execute(
            query,
            (
                bt,
                loc,
                limit,
                offset,
            ),
        )

        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]

        results = [dict(zip(columns, row)) for row in rows]

        cur.close()

        return {
            "success": True,
            "filters": {
                "business_type": business_type,
                "location": location,
                "company_size": company_size,  # ignored
            },
            "count": len(results),
            "data": results,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@router.get("/leads/by-source/{source_name}")
async def get_leads_by_source_name(
    source_name: str = Path(..., description="The name of the source to fetch leads from"),
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
):
    """Fetch all leads associated with a specific source name."""
    try:
        conn, cur = get_db_cursor()
        
        # Verify source exists
        cur.execute("SELECT id, name, url FROM sources WHERE name = %s", (source_name,))
        source_row = cur.fetchone()
        if not source_row:
            raise HTTPException(status_code=404, detail=f"Source with name '{source_name}' not found")
        
        source_id = source_row[0]
        source_url = source_row[2]
        
        # Fetch leads where source column matches
        query = """
            SELECT 
                id, name, category, address, phone, email, website,
                rating, reviews_count, source, source_entity, created_at
            FROM leads
            WHERE source = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        
        cur.execute(query, (source_name, limit, offset))
        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]
        
        leads = []
        for row in rows:
            lead_dict = dict(zip(columns, row))
            lead_dict['company_name'] = lead_dict.get('name', '')
            # Convert datetime to string for JSON serialization
            if lead_dict.get('created_at'):
                lead_dict['created_at'] = lead_dict['created_at'].isoformat()
            leads.append(lead_dict)
        
        cur.close()
        conn.close()
        
        return {
            "success": True,
            "source_name": source_name,
            "source_id": source_id,
            "source_url": source_url,
            "total_leads": len(leads),
            "leads": leads
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching leads: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch leads: {str(e)}")
