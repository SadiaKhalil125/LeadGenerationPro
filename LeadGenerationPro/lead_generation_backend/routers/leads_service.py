# leads_schema.py
from psycopg2 import sql
from routers.get_db_connection import get_db_cursor

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


# leads_normalization.py
import hashlib

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


# routers/leads_sync.py
from fastapi import APIRouter, HTTPException
from typing import List

router = APIRouter()

@router.post("/leads/sync")
async def sync_leads(
    entity_tables: List[str],
    batch_size: int = 500
):
    """
    Normalize entity tables into unified leads table.
    Safe to re-run.
    """

    if not entity_tables:
        raise HTTPException(status_code=400, detail="entity_tables required")

    ensure_leads_table()

    conn, cur = get_db_cursor()
    total_processed = 0
    total_upserted = 0

    for table in entity_tables:
        table = table.strip()

        # --- get columns ---
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s
        """, (table,))
        columns = [c[0] for c in cur.fetchall()]

        if not columns:
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
                break

            for row in rows:
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

            conn.commit()
            total_processed += len(rows)
            offset += batch_size

    cur.close()

    return {
        "success": True,
        "tables_processed": entity_tables,
        "rows_processed": total_processed,
        "rows_upserted": total_upserted
    }
