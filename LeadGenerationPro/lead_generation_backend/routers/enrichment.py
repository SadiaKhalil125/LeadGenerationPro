"""
Enrichment Router
-----------------
Handles contact-data enrichment for any entity table using:
  • Apollo.io  – POST /v1/people/match
  • Hunter.io  – GET  /v2/email-finder  (email)  +  GET /v2/people-finder (phone – best-effort)

Flow
----
1.  Client calls POST /enrichment/schedule
2.  We validate entity + provider + config, persist a job row in `enrichment_jobs`,
    and fire off the background task immediately (or at a scheduled time – here
    we run immediately in a thread so as not to block the event loop).
3.  The background worker:
    a.  Reads all rows from the entity table.
    b.  Calls the chosen API for each row.
    c.  Ensures `email` and `phone` columns exist (ALTER TABLE … ADD COLUMN IF NOT EXISTS).
    d.  Updates each row in-place with enriched data.
    e.  Marks the job as completed / failed in `enrichment_jobs`.
"""

from __future__ import annotations

import json
import logging
import threading
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Body, HTTPException
from psycopg2 import sql

from routers.get_db_connection import get_db_cursor

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _ensure_enrichment_jobs_table(conn):
    """Create enrichment_jobs table if absent."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS enrichment_jobs (
                id            SERIAL PRIMARY KEY,
                job_id        UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
                entity_name   TEXT NOT NULL,
                provider      TEXT NOT NULL,          -- 'apollo' | 'hunter'
                config        JSONB NOT NULL DEFAULT '{}',
                status        TEXT NOT NULL DEFAULT 'queued',
                total_rows    INTEGER DEFAULT 0,
                enriched_rows INTEGER DEFAULT 0,
                failed_rows   INTEGER DEFAULT 0,
                error_message TEXT,
                created_at    TIMESTAMP DEFAULT NOW(),
                started_at    TIMESTAMP,
                completed_at  TIMESTAMP
            );
        """)
        conn.commit()


def _ensure_columns(conn, table_name: str, columns: List[str]):
    """Add TEXT columns to *table_name* if they don't already exist."""
    with conn.cursor() as cur:
        for col in columns:
            cur.execute(
                sql.SQL(
                    "ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col} TEXT;"
                ).format(
                    tbl=sql.Identifier(table_name),
                    col=sql.Identifier(col),
                )
            )
        conn.commit()


def _update_job(conn, job_id: str, **kwargs):
    if not kwargs:
        return
    set_parts = [
        sql.SQL("{} = %s").format(sql.Identifier(k))
        for k in kwargs
    ]
    values = list(kwargs.values()) + [job_id]
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("UPDATE enrichment_jobs SET {} WHERE job_id = %s").format(
                sql.SQL(", ").join(set_parts)
            ),
            values,
        )
        conn.commit()


# ---------------------------------------------------------------------------
# Apollo helper
# ---------------------------------------------------------------------------

def _enrich_via_apollo(row: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call Apollo /v1/people/match for one row.
    Returns dict with 'email' and 'phone' keys (may be None if not found).
    """
    from .services.outreach_config import settings
    
    api_key = config.get("api_key") or settings.APOLLO_API_KEY
    if not api_key:
        raise ValueError("Apollo API key is missing. Please set it in .env as APOLLO_API_KEY or provide it in the dashboard.")

    payload: Dict[str, Any] = {
        "reveal_personal_emails": True,
        "reveal_phone_number": True,
    }

    # Map common column names to Apollo fields
    col_map = {
        "first_name":        ["first_name", "firstname", "fname"],
        "last_name":         ["last_name",  "lastname",  "lname"],
        "email":             ["email", "email_address"],
        "organization_name": ["company", "organization", "organization_name", "company_name"],
        "domain":            ["domain", "website", "company_domain"],
        "linkedin_url":      ["linkedin", "linkedin_url"],
        "title":             ["title", "job_title", "position"],
    }

    for apollo_key, candidates in col_map.items():
        for cand in candidates:
            val = row.get(cand)
            if val:
                payload[apollo_key] = val
                break

    headers = {
        "Content-Type": "application/json",
        "X-Api-Key": api_key,
    }

    with httpx.Client(timeout=30) as client:
        resp = client.post(
            "https://api.apollo.io/v1/people/match",
            json=payload,
            headers=headers,
        )

    result: Dict[str, Any] = {"email": None, "phone": None}

    if resp.status_code == 200:
        data = resp.json()
        person = data.get("person") or {}
        result["email"] = person.get("email")
        phones = person.get("phone_numbers") or []
        if phones:
            result["phone"] = phones[0].get("raw_number") or phones[0].get("sanitized_number")
        # Also pull other useful fields if user wants
        for extra_key in ("title", "linkedin_url", "city", "state", "country"):
            val = person.get(extra_key)
            if val:
                result[extra_key] = val
    else:
        logger.warning("Apollo returned %s: %s", resp.status_code, resp.text[:300])

    return result


# ---------------------------------------------------------------------------
# Hunter helper
# ---------------------------------------------------------------------------

def _enrich_via_hunter(row: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call Hunter /v2/email-finder for one row.
    Returns dict with 'email' and 'phone' keys.

    Note: Hunter email-finder does NOT return phone numbers.
    The phone field will remain None unless already present in the row.
    """
    from .services.outreach_config import settings
    
    api_key = config.get("api_key") or settings.HUNTER_API_KEY
    if not api_key:
        raise ValueError("Hunter API key is missing. Please set it in .env as HUNTER_API_KEY or provide it in the dashboard.")

    # Resolve first_name / last_name / domain
    def _pick(row, *candidates):
        for c in candidates:
            v = row.get(c)
            if v:
                return str(v).strip()
        return None

    first_name = _pick(row, "first_name", "firstname", "fname")
    last_name  = _pick(row, "last_name",  "lastname",  "lname")
    domain     = _pick(row, "domain", "website", "company_domain", "company_website")

    # Fall back: try to derive domain from company_name if provided
    company = _pick(row, "company", "organization", "company_name", "organization_name")

    result: Dict[str, Any] = {"email": None, "phone": None}

    if not (first_name and last_name and domain):
        logger.debug(
            "Hunter skip – missing fields: first=%s last=%s domain=%s",
            first_name, last_name, domain,
        )
        return result

    params = {
        "first_name": first_name,
        "last_name":  last_name,
        "domain":     domain,
        "api_key":    api_key,
    }

    with httpx.Client(timeout=30) as client:
        resp = client.get("https://api.hunter.io/v2/email-finder", params=params)

    if resp.status_code == 200:
        data = resp.json().get("data") or {}
        result["email"] = data.get("email")
        # Hunter does not supply phone – leave as None
    else:
        logger.warning("Hunter returned %s: %s", resp.status_code, resp.text[:300])

    return result


# ---------------------------------------------------------------------------
# Website Scraper helper
# ---------------------------------------------------------------------------

try:
    from routers.services.website_scraper import scrape_site
except ImportError:
    scrape_site = None

def _enrich_via_website(row: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call the background web scraper for one row.
    Returns dict with 'email' and 'phone' keys.
    """
    if not scrape_site:
        logger.error("website_scraper module not found")
        return {"email": None, "phone": None}
    
    def _pick(row, *candidates):
        for c in candidates:
            v = row.get(c)
            if v:
                return str(v).strip()
        return None

    domain = _pick(row, "domain", "website", "company_domain", "company_website", "url")
    result: Dict[str, Any] = {"email": None, "phone": None}

    name    = _pick(row, "first_name", "last_name", "name", "full_name")
    company = _pick(row, "company", "organization", "company_name", "organization_name")
    
    scrape_result = scrape_site(domain, delay=0.5, name=name, company=company)
    
    emails = scrape_result.get("emails", [])
    phones = scrape_result.get("phones", [])
    
    if emails:
        result["email"] = emails[0]
    if phones:
        result["phone"] = phones[0]
        
    return result

# ---------------------------------------------------------------------------
# Background worker
# ---------------------------------------------------------------------------

PROVIDER_FN = {
    "apollo": _enrich_via_apollo,
    "hunter": _enrich_via_hunter,
    "website": _enrich_via_website,
}


def _run_enrichment(job_id: str, entity_name: str, provider: str, config: Dict[str, Any]):
    """
    Background thread that performs the actual enrichment.
    """
    conn = None
    try:
        conn, _ = get_db_cursor()
        _ensure_enrichment_jobs_table(conn)
        _update_job(conn, job_id, status="running", started_at=datetime.now())

        # --- 1. Fetch all rows from entity table ---
        with conn.cursor() as cur:
            # Get column names
            cur.execute(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_name = %s ORDER BY ordinal_position
                """,
                (entity_name,),
            )
            columns = [r[0] for r in cur.fetchall()]

            # Fetch rows
            cur.execute(
                sql.SQL("SELECT * FROM {}").format(sql.Identifier(entity_name))
            )
            raw_rows = cur.fetchall()

        rows = [dict(zip(columns, r)) for r in raw_rows]
        total = len(rows)
        _update_job(conn, job_id, total_rows=total)

        # --- 2. Ensure email + phone columns exist ---
        _ensure_columns(conn, entity_name, ["email", "phone"])

        # --- 3. Enrich each row ---
        enrich_fn = PROVIDER_FN[provider]
        enriched = 0
        failed   = 0

        for row in rows:
            row_id = row.get("id")
            try:
                enriched_data = enrich_fn(row, config)
                # Build update pairs (only non-None values)
                updates = {k: v for k, v in enriched_data.items() if v is not None}
                if not updates:
                    continue

                # Ensure all enriched columns exist
                _ensure_columns(conn, entity_name, list(updates.keys()))

                set_clause = sql.SQL(", ").join(
                    sql.SQL("{} = %s").format(sql.Identifier(k))
                    for k in updates
                )
                vals = list(updates.values()) + [row_id]
                with conn.cursor() as cur:
                    cur.execute(
                        sql.SQL("UPDATE {} SET {} WHERE id = %s").format(
                            sql.Identifier(entity_name), set_clause
                        ),
                        vals,
                    )
                    conn.commit()
                enriched += 1
                logger.info(f"Enrichment Job [{job_id[:8]}] - Processed row {enriched+failed}/{total} (Success)")
            except Exception as row_err:
                logger.warning(f"Enrichment Job [{job_id[:8]}] - Failed row id={row_id}: {row_err}")
                failed += 1
            
            # Periodically update the progress in the DB so the frontend sees it immediately.
            try:
                _update_job(
                    conn, job_id,
                    enriched_rows=enriched,
                    failed_rows=failed,
                )
            except Exception:
                pass

        _update_job(
            conn, job_id,
            status="completed",
            enriched_rows=enriched,
            failed_rows=failed,
            completed_at=datetime.now(),
        )
        logger.info(
            "Enrichment job %s done – enriched=%d failed=%d total=%d",
            job_id, enriched, failed, total,
        )

    except Exception as exc:
        logger.exception("Enrichment job %s crashed: %s", job_id, exc)
        if conn:
            try:
                _update_job(
                    conn, job_id,
                    status="failed",
                    error_message=str(exc),
                    completed_at=datetime.now(),
                )
            except Exception:
                pass
    finally:
        if conn:
            conn.close()


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@router.post("/schedule", response_model=dict)
async def schedule_enrichment(payload: Dict[str, Any] = Body(...)):
    """
    Schedule (and immediately kick off) an enrichment job.

    Body:
    {
        "entity_name": "contacts",
        "provider": "apollo",          // "apollo" | "hunter"
        "config": {
            "api_key": "xxx"
        }
    }
    """
    entity_name = payload.get("entity_name", "").strip()
    provider    = payload.get("provider", "").strip().lower()
    config      = payload.get("config", {})

    if not entity_name:
        raise HTTPException(status_code=400, detail="entity_name is required")
    if provider not in PROVIDER_FN:
        raise HTTPException(status_code=400, detail=f"provider must be one of: {list(PROVIDER_FN)}")
    if provider in ("apollo", "hunter") and not config.get("api_key"):
        raise HTTPException(status_code=400, detail=f"config.api_key is required for {provider}")

    conn, _ = get_db_cursor()
    _ensure_enrichment_jobs_table(conn)

    # Verify entity table exists
    with conn.cursor() as cur:
        cur.execute(
            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = %s)",
            (entity_name,),
        )
        exists = cur.fetchone()[0]
    if not exists:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Entity table '{entity_name}' not found")

    # Create job record
    job_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO enrichment_jobs (job_id, entity_name, provider, config, status)
            VALUES (%s, %s, %s, %s, 'queued')
            """,
            (job_id, entity_name, provider, json.dumps(config)),
        )
        conn.commit()
    conn.close()

    # Fire background thread
    t = threading.Thread(
        target=_run_enrichment,
        args=(job_id, entity_name, provider, config),
        daemon=True,
    )
    t.start()

    return {
        "success": True,
        "job_id": job_id,
        "message": f"Enrichment job started for entity '{entity_name}' using {provider}",
    }


@router.get("/jobs", response_model=dict)
async def list_enrichment_jobs(entity_name: Optional[str] = None):
    """List all enrichment jobs (optionally filter by entity_name)."""
    conn, _ = get_db_cursor()
    _ensure_enrichment_jobs_table(conn)

    with conn.cursor() as cur:
        if entity_name:
            cur.execute(
                """
                SELECT job_id, entity_name, provider, status, total_rows, enriched_rows,
                       failed_rows, error_message, created_at, started_at, completed_at
                FROM enrichment_jobs WHERE entity_name = %s ORDER BY created_at DESC
                """,
                (entity_name,),
            )
        else:
            cur.execute(
                """
                SELECT job_id, entity_name, provider, status, total_rows, enriched_rows,
                       failed_rows, error_message, created_at, started_at, completed_at
                FROM enrichment_jobs ORDER BY created_at DESC LIMIT 100
                """
            )
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]

    conn.close()
    # Serialise datetime objects
    for row in rows:
        for k, v in row.items():
            if isinstance(v, datetime):
                row[k] = v.isoformat()

    return {"jobs": rows, "total": len(rows)}


@router.get("/jobs/{job_id}", response_model=dict)
async def get_enrichment_job(job_id: str):
    """Get status of a specific enrichment job."""
    conn, _ = get_db_cursor()
    _ensure_enrichment_jobs_table(conn)

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT job_id, entity_name, provider, status, total_rows, enriched_rows,
                   failed_rows, error_message, created_at, started_at, completed_at
            FROM enrichment_jobs WHERE job_id = %s
            """,
            (job_id,),
        )
        cols = [d[0] for d in cur.description]
        row  = cur.fetchone()

    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    data = dict(zip(cols, row))
    for k, v in data.items():
        if isinstance(v, datetime):
            data[k] = v.isoformat()

    return {"success": True, "job": data}


@router.delete("/jobs/{job_id}", response_model=dict)
async def delete_enrichment_job(job_id: str):
    """Delete an enrichment job from the database."""
    conn, _ = get_db_cursor()
    _ensure_enrichment_jobs_table(conn)

    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM enrichment_jobs WHERE job_id = %s", (job_id,))
        if not cur.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="Job not found")
        
        cur.execute("DELETE FROM enrichment_jobs WHERE job_id = %s", (job_id,))
        conn.commit()

    conn.close()
    return {"success": True, "message": "Job deleted successfully"}
