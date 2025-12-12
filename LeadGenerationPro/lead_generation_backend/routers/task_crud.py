from fastapi import HTTPException
from models import TaskInfo,TaskRequest,TasksListResponse, SourceInfo, TaskUpdateRequest, PreviewMappingRequest, PaginationConfig, CaptchaParams
from fastapi import APIRouter
from datetime import datetime
from routers.get_db_connection import get_db_cursor
from crawl4Util import extract_website
from scraping_router import route_scraping_request 
from models import ScrapeRequest
from psycopg2 import sql
from datetime import datetime, timezone
import os
import psycopg2
from routers.scheduler_config import scheduler, enqueue_and_reschedule, enqueue_task, get_next_scheduled_time
import asyncio
import logging
import json
import traceback
from typing import Dict, Optional, List
from threading import Lock

logger = logging.getLogger(__name__)

# In-memory storage for quick extract task results (execution_id -> result)
# Also stored in database for cross-process access
quick_extract_results: Dict[str, dict] = {}
quick_extract_logs: Dict[str, List[dict]] = {}  # execution_id -> list of logs
quick_extract_lock = Lock()

def create_quick_extract_results_table(conn):
    """Create quick_extract_results table if it doesn't exist."""
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS quick_extract_results (
            execution_id VARCHAR(255) PRIMARY KEY,
            status TEXT NOT NULL,
            success BOOLEAN NOT NULL,
            message TEXT,
            data JSONB,
            total_items INTEGER DEFAULT 0,
            items_scraped INTEGER DEFAULT 0,
            url TEXT,
            scraped_at TIMESTAMP,
            execution_duration_ms INTEGER,
            error TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_quick_extract_results_execution_id ON quick_extract_results(execution_id);
    """)
    conn.commit()
    cur.close()

def create_quick_extract_logs_table(conn):
    """Create quick_extract_logs table if it doesn't exist, and add new columns if missing."""
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS quick_extract_logs (
            id SERIAL PRIMARY KEY,
            execution_id VARCHAR(255) NOT NULL,
            status TEXT NOT NULL,
            log_level TEXT NOT NULL,
            message TEXT NOT NULL,
            details JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    
    # Add new columns if they don't exist (for existing tables)
    try:
        cur.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='quick_extract_logs' AND column_name='error_traceback') THEN
                    ALTER TABLE quick_extract_logs ADD COLUMN error_traceback TEXT;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='quick_extract_logs' AND column_name='execution_duration_ms') THEN
                    ALTER TABLE quick_extract_logs ADD COLUMN execution_duration_ms INT;
                END IF;
            END $$;
        """)
    except Exception as e:
        logger.warning(f"Error adding columns to quick_extract_logs table: {e}")
    
    # Create index if it doesn't exist
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_quick_extract_logs_execution_id ON quick_extract_logs(execution_id);
    """)
    conn.commit()
    cur.close()

VALID_REPEATS = {"once", "daily", "weekly", "monthly", "yearly"}
# DATABASE_URL = os.getenv("DATABASE_URL","postgresql://postgres:9042c98a@host.docker.internal:5432/LeadGenerationPro")
# DATABASE_URL = os.getenv("DATABASE_URL","postgresql://postgres:9042c98a@localhost:5432/LeadGenerationPro")
router = APIRouter()

def create_execution_logs_table(conn):
    """Create task_execution_logs table if it doesn't exist."""
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS task_execution_logs (
            id SERIAL PRIMARY KEY,
            task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
            execution_id UUID DEFAULT gen_random_uuid(),
            status TEXT NOT NULL CHECK (status IN ('queued', 'started', 'processing', 'completed', 'failed', 'error')),
            log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warning', 'error', 'debug')),
            message TEXT NOT NULL,
            details JSONB,
            error_traceback TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            execution_duration_ms INT
        );
        CREATE INDEX IF NOT EXISTS idx_task_execution_logs_task_id ON task_execution_logs(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_execution_logs_execution_id ON task_execution_logs(execution_id);
        CREATE INDEX IF NOT EXISTS idx_task_execution_logs_created_at ON task_execution_logs(created_at DESC);
    """)
    conn.commit()
    cur.close()

def log_execution(conn, task_id: int, execution_id: str, status: str, log_level: str, 
                  message: str, details: dict = None, error_traceback: str = None, 
                  execution_duration_ms: int = None):
    """Log execution details to the database."""
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO task_execution_logs 
            (task_id, execution_id, status, log_level, message, details, error_traceback, execution_duration_ms)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            task_id, execution_id, status, log_level, message,
            json.dumps(details) if details else None,
            error_traceback,
            execution_duration_ms
        ))
        conn.commit()
        cur.close()
    except Exception as e:
        logger.error(f"Failed to log execution: {e}")
        # Don't raise - logging failure shouldn't break execution

# def get_db_cursor_docker():
#     connection = psycopg2.connect(DATABASE_URL)
#     return connection, connection.cursor()

@router.post("/create-task", response_model=dict)
async def create_task(request: TaskRequest):
    """Create a scheduled scraping task."""
    try:
        if request.repeat not in VALID_REPEATS:
            raise HTTPException(status_code=400, detail="Invalid repeat value")
        
        if request.scheduled_time < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")

        conn, cur = get_db_cursor()
        # cur = conn.cursor()
        
        # Create tasks table if it doesn't exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            task_name TEXT UNIQUE NOT NULL,
            source_id INT REFERENCES sources(id) ON DELETE CASCADE,
            mapping_id INT REFERENCES entity_mappings(id) ON DELETE CASCADE,
            scheduled_time TIMESTAMP NOT NULL,
            repeat TEXT DEFAULT 'once' CHECK (repeat IN ('once', 'daily', 'weekly', 'monthly', 'yearly')),
            last_executed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            max_items INT DEFAULT 10,
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
            INSERT INTO tasks (task_name, source_id, mapping_id, scheduled_time, repeat, max_items)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (task_name, request.source_id, request.mapping_id, request.scheduled_time, request.repeat, request.max_items))
        
        task_id = cur.fetchone()[0]
        conn.commit()
        scheduler.add_job(
            lambda t=task_id: enqueue_and_reschedule(t),
            'date',
            id=str(task_id),
            replace_existing=True,
            run_date=request.scheduled_time
        )
        cur.close()

        return {
            "success": True,
            "task_id": task_id,
            "task_name": task_name,
            "message": f"Task '{task_name}' created successfully"
        }
        
    except HTTPException:
        # conn.rollback()
        raise
    except Exception as e:
        # conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

@router.get("/tasks", response_model=TasksListResponse)
async def get_all_tasks():
    """Get all scheduled tasks with their details."""
    try:
        conn, cur = get_db_cursor()
        # cur = conn.cursor()
        
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
                t.created_at,
                t.repeat,
                t.last_executed_at,
                t.max_items
                    
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
                created_at=row[8],
                repeat=row[9],
                last_executed_at=row[10],
                max_items=row[11]

            ))
        
        cur.close()
        
        return TasksListResponse(
            total_tasks=len(tasks),
            tasks=tasks
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tasks: {str(e)}")


@router.delete("/delete-task/{task_id}", response_model=dict)
async def delete_task(task_id: int):
    """Delete a scheduled task."""
    try:
        conn, cur = get_db_cursor()
        # cur = conn.cursor()
        
        # Check if task exists
        cur.execute("SELECT task_name FROM tasks WHERE id = %s", (task_id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task_name = result[0]
        
        # Delete task
        cur.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        conn.commit()

        # Delete task from scheduler
        tid = str(task_id)
        if scheduler.get_job(tid):
            scheduler.remove_job(tid)

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
    

def schedule_task(tid):
    enqueue_and_reschedule(tid)

@router.put("/update-task/{task_id}", response_model=dict)
async def update_task(task_id: int, request: TaskUpdateRequest):
    """Update a task's scheduled time and optionally its name."""
    try:
        if request.repeat not in VALID_REPEATS:
            raise HTTPException(status_code=400, detail="Invalid repeat value")
        
        if request.scheduled_time < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")

        conn, cur = get_db_cursor()
        
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
            SET scheduled_time = %s, task_name = %s, repeat = %s, max_items = %s
            WHERE id = %s
        """, (
            request.scheduled_time,
            new_task_name,
            request.repeat,
            request.max_items,  # goes into max_items
            task_id             # goes into WHERE id = %s
        ))
        rows = cur.rowcount
        print("Updated rows:", rows)
        if rows == 0:
         raise HTTPException(status_code=400, detail=f"No task updated for id={task_id}")

        conn.commit()

        # Update scheduler job
        
    
        scheduler.add_job(
            schedule_task,
            'date',
            id=str(task_id),
            replace_existing=True,
            run_date=request.scheduled_time,
            args=[task_id]    # <-- pass task_id here
        )
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
 
async def upsert_entity_record(cur,entity_name: str, source_name: str, item: dict):
    """
    Upsert row based on the entity's unique index. To avoid de-duplication.
    Assumes a unique index exists named '{table_name}_unique_composite_idx'.
    """
    # Ensure source & modified_at are present
    item["source"] = source_name
    item["modified_at"] = datetime.now()
    columns = list(item.keys())
    values = list(item.values())

    constraint_name = f"{entity_name.lower()}_unique_composite_idx"
    logger.debug("Reached upsert stage for entity=%s, name=%s", entity_name, item.get('name'))

    insert_stmt = sql.SQL("""
        INSERT INTO {table} ({cols})
        VALUES ({vals})
        ON CONFLICT ON CONSTRAINT {constraint}
        DO UPDATE SET {updates}, modified_at = NOW()
    """).format(
        table=sql.Identifier(entity_name),
        cols=sql.SQL(", ").join(map(sql.Identifier, columns)),
        vals=sql.SQL(", ").join(sql.Placeholder() * len(columns)),
        constraint=sql.Identifier(constraint_name),
        updates=sql.SQL(", ").join(
            sql.SQL("{} = EXCLUDED.{}").format(sql.Identifier(col), sql.Identifier(col))
            for col in columns if col != "modified_at"
        )
    )
    try:
        cur.execute(insert_stmt, values)
        logger.debug("Upsert executed for entity=%s name=%s", entity_name, item.get('name'))
    except Exception as e:
        logger.exception("Upsert failed for entity=%s name=%s: %s", entity_name, item.get('name'), e)
        # re-raise so caller can handle/skip this row
        raise

    
# async def upsert_entity_record(cur,entity_name: str, source_name: str, item: dict):
#     """
#     Upsert row based on the entity's unique index. To avoid de-duplication.
#     Assumes a unique index exists named '{table_name}_unique_composite_idx'.
#     """
#     # Ensure source & modified_at are present
#     item["source"] = source_name
#     item["modified_at"] = datetime.now()
#     columns = list(item.keys())
#     values = list(item.values())

#     logger.debug("Reached upsert stage for entity=%s, name=%s", entity_name, item.get('name'))

#     # Try several common constraint name variants to cover different naming
#     # conventions (case differences and suffixes like '_index').
#     candidates = [
#         f"{entity_name}_unique_composite_idx",
#         f"{entity_name.lower()}_unique_composite_idx",
#         f"{entity_name.lower()}_unique_composite_index",
#         f"{entity_name}_unique_composite_index",
#     ]

#     # Attempt each candidate constraint name first
#     for cname in candidates:
#         insert_stmt = sql.SQL("""
#             INSERT INTO {table} ({cols})
#             VALUES ({vals})
#             ON CONFLICT ON CONSTRAINT {constraint}
#             DO UPDATE SET {updates}, modified_at = NOW()
#         """).format(
#             table=sql.Identifier(entity_name),
#             cols=sql.SQL(", ").join(map(sql.Identifier, columns)),
#             vals=sql.SQL(", ").join(sql.Placeholder() * len(columns)),
#             constraint=sql.Identifier(cname),
#             updates=sql.SQL(", ").join(
#                 sql.SQL("{} = EXCLUDED.{}").format(sql.Identifier(col), sql.Identifier(col))
#                 for col in columns if col != "modified_at"
#             )
#         )
#         try:
#             cur.execute(insert_stmt, values)
#             logger.debug("Upsert executed for entity=%s name=%s using constraint %s", entity_name, item.get('name'), cname)
#             return
#         except Exception as e:
#             msg = str(e).lower()
#             # If it's a missing constraint error, try the next candidate
#             if 'does not exist' in msg or 'constraint' in msg and 'does not exist' in msg:
#                 logger.debug("Constraint %s not found for table %s, trying next candidate", cname, entity_name)
#                 continue
#             # Other errors should be propagated
#             logger.exception("Upsert failed for entity=%s name=%s using constraint %s: %s", entity_name, item.get('name'), cname, e)
#             raise

#     # If none of the named constraints matched, fall back to discovering UNIQUE
#     # constraints on the table and using the corresponding columns in ON CONFLICT(...)
#     try:
#         logger.warning("Named constraints not found for table %s; discovering UNIQUE constraints via information_schema", entity_name)
#         conn = cur.connection
#         info_cur = conn.cursor()
#         # Use lowercased table name for information_schema lookups (postgres folds
#         # unquoted identifiers to lowercase).
#         info_cur.execute("""
#             SELECT tc.constraint_name, array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS cols
#             FROM information_schema.table_constraints tc
#             JOIN information_schema.key_column_usage kcu
#               ON tc.constraint_name = kcu.constraint_name AND tc.table_name = kcu.table_name
#             WHERE tc.table_name = %s AND tc.constraint_type = 'UNIQUE'
#             GROUP BY tc.constraint_name
#         """, (entity_name.lower(),))
#         constraints = info_cur.fetchall()
#         info_cur.close()

#         if not constraints:
#             logger.exception("No UNIQUE constraints found for table %s; cannot perform upsert by conflict", entity_name)
#             raise

#         # Choose the first UNIQUE constraint and use its columns
#         cols = constraints[0][1]
#         insert_stmt_cols = sql.SQL("""
#             INSERT INTO {table} ({cols})
#             VALUES ({vals})
#             ON CONFLICT ({conflict_cols})
#             DO UPDATE SET {updates}, modified_at = NOW()
#         """).format(
#             table=sql.Identifier(entity_name),
#             cols=sql.SQL(", ").join(map(sql.Identifier, columns)),
#             vals=sql.SQL(", ").join(sql.Placeholder() * len(columns)),
#             conflict_cols=sql.SQL(", ").join(map(sql.Identifier, cols)),
#             updates=sql.SQL(", ").join(
#                 sql.SQL("{} = EXCLUDED.{}").format(sql.Identifier(col), sql.Identifier(col))
#                 for col in columns if col != "modified_at"
#             )
#         )
#         cur.execute(insert_stmt_cols, values)
#         logger.debug("Upsert executed using discovered unique columns for entity=%s name=%s: %s", entity_name, item.get('name'), cols)
#         return
#     except Exception as e:
#         logger.exception("Upsert failed for entity=%s name=%s after fallback: %s", entity_name, item.get('name'), e)
#         raise

async def _execute_task_internal(task_id: int):
    """Internal function to execute a task by scraping data and storing it in the corresponding entity table.
    This is called by the Kafka worker after consuming a task from the queue."""
    import uuid
    execution_id = str(uuid.uuid4())
    execution_start = datetime.now()
    conn = None
    try:
        conn, cur = get_db_cursor()
        
        # Create execution logs table if it doesn't exist
        create_execution_logs_table(conn)
        
        # Log execution start
        log_execution(conn, task_id, execution_id, 'started', 'info', 
                     f'Task execution started', {'execution_id': execution_id})
        
        # Get task details with all necessary information
        log_execution(conn, task_id, execution_id, 'processing', 'info', 
                     'Fetching task details from database')
        
        cur.execute("""
            SELECT 
                t.id,
                t.task_name,
                t.source_id,
                s.name as source_name,
                s.url as source_url,
                s.pagination_config,
                s.is_captcha_protected,
                s.captcha_params,
                t.mapping_id,
                t.repeat,
                t.max_items,
                em.mapping_name,
                em.entity_name,
                em.container_selector,
                em.field_mappings
            FROM tasks t
            JOIN sources s ON t.source_id = s.id
            JOIN entity_mappings em ON t.mapping_id = em.id
            WHERE t.id = %s
        """, (task_id,))
        
        task_data = cur.fetchone()
        if not task_data:
            log_execution(conn, task_id, execution_id, 'failed', 'error', 
                         f'Task not found in database', {'task_id': task_id})
            raise HTTPException(status_code=404, detail="Task not found")
        
        
        # Extract task information
        (task_id_db, task_name, source_id, source_name, source_url, pagination_config, is_captcha_protected, captcha_params,
         mapping_id, repeat, max_items, mapping_name, entity_name, container_selector, field_mappings) = task_data

        log_execution(conn, task_id, execution_id, 'processing', 'info', 
                     'Task details retrieved successfully', {
                         'task_name': task_name,
                         'source_name': source_name,
                         'source_url': source_url,
                         'entity_name': entity_name,
                         'mapping_name': mapping_name,
                         'max_items': max_items
                     })

        # Build ScrapeRequest from task data
        log_execution(conn, task_id, execution_id, 'processing', 'info', 
                     'Building scrape request')
        
        # Build ScrapeRequest from task data
        scrape_request = ScrapeRequest(
            entity_name=entity_name,
            url=source_url,
            pagination_config=pagination_config,
            container_selector=container_selector,
            field_mappings=field_mappings,
            max_items=max_items,
            timeout=30,
            captcha_params=captcha_params if is_captcha_protected else None
        )
        # if user left params to us to auto-detect
        if is_captcha_protected and scrape_request.captcha_params is None:
            scrape_request.captcha_params = CaptchaParams(
                site_url=source_url  # minimal required field from your model
        )
        
        # Execute scraping using the dynamic scraper (now properly async)
        log_execution(conn, task_id, execution_id, 'processing', 'info', 
                     'Starting web scraping', {'url': source_url, 'timeout': 500})
        
        scrape_start = datetime.now()
        scrape_response = await route_scraping_request(scrape_request)
        scrape_duration = int((datetime.now() - scrape_start).total_seconds() * 1000)

        # clip to max_items (before was handled in crawler)
        scrape_data = scrape_response.data[:max_items] if scrape_response.data else [] 
        
        if not scrape_response.success or not scrape_data:
            error_details = {
                'scraping_message': scrape_response.message,
                'scraping_duration_ms': scrape_duration
            }
            log_execution(conn, task_id, execution_id, 'failed', 'error', 
                         f'Scraping failed: {scrape_response.message}', error_details)
            
            return {
                "success": False,
                "task_id": task_id,
                "task_name": task_name,
                "message": f"Scraping failed: {scrape_response.message}",
                "items_scraped": 0,
                "items_stored": 0,
                "execution_id": execution_id
            }
        
        log_execution(conn, task_id, execution_id, 'processing', 'info', 
                     'Scraping completed successfully', {
                         'items_scraped': len(scrape_data),
                         'total_items_found': scrape_response.total_items,
                         'scraping_duration_ms': scrape_duration
                     })
        
        # Get entity table structure to match fields
        log_execution(conn, task_id, execution_id, 'processing', 'info', 
                     f'Retrieving entity table structure for {entity_name}')
        
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = %s 
            AND column_name != 'id'
            ORDER BY ordinal_position
        """, (entity_name,))
        
        table_columns = {row[0]: row[1] for row in cur.fetchall()}
        
        if not table_columns:
            error_msg = f"Entity table '{entity_name}' not found or has no columns"
            log_execution(conn, task_id, execution_id, 'failed', 'error', error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        log_execution(conn, task_id, execution_id, 'processing', 'info', 
                     'Entity table structure retrieved', {
                         'table_name': entity_name,
                         'column_count': len(table_columns),
                         'columns': list(table_columns.keys())
                     })
        
        # Insert / Update scraped data in the entity table
        log_execution(conn, task_id, execution_id, 'processing', 'info', 
                     'Starting to upsert scraped data into database')
        
        items_stored = 0
        items_failed = 0
        upsert_errors = []
        
        for idx, item in enumerate(scrape_data):
            insert_data = {col: item.get(col) for col in table_columns.keys()}
            try:
                await upsert_entity_record(cur, entity_name, source_name, insert_data)
                items_stored += 1
                if (idx + 1) % 10 == 0:  # Log every 10 items
                    log_execution(conn, task_id, execution_id, 'processing', 'debug', 
                                 f'Upserted {idx + 1}/{len(scrape_data)} items')
            except Exception as e:
                items_failed += 1
                error_msg = str(e)
                upsert_errors.append({'item_index': idx, 'error': error_msg})
                # Rollback the connection so subsequent commands (like logging)
                # are allowed. A failed INSERT/ON CONFLICT leaves the transaction
                # in aborted state until rollback is called.
                try:
                    conn.rollback()
                except Exception:
                    pass
                log_execution(conn, task_id, execution_id, 'error', 'error', 
                             f'Error upserting row {idx + 1}: {error_msg}', 
                             {'item_index': idx, 'item_data': {k: str(v)[:100] for k, v in item.items()}})
                continue

        log_execution(conn, task_id, execution_id, 'processing', 'info', 
                     'Data upsert completed', {
                         'items_stored': items_stored,
                         'items_failed': items_failed,
                         'total_items': len(scrape_data)
                     })

        # update last_executed_at timestamp
        cur.execute("""
            UPDATE tasks
            SET last_executed_at = %s
            WHERE id = %s
        """, (datetime.now(), task_id))

        conn.commit()
        
        execution_duration = int((datetime.now() - execution_start).total_seconds() * 1000)
        
        log_execution(conn, task_id, execution_id, 'completed', 'info', 
                     f'Task execution completed successfully', {
                         'items_scraped': len(scrape_data),
                         'items_stored': items_stored,
                         'items_failed': items_failed,
                         'total_execution_duration_ms': execution_duration,
                         'scraping_duration_ms': scrape_duration
                     }, execution_duration_ms=execution_duration)
        
        return {
            "success": True,
            "task_id": task_id,
            "task_name": task_name,
            "entity_name": entity_name,
            "message": f"Task '{task_name}' executed successfully",
            "items_scraped": len(scrape_data),
            "items_stored": items_stored,
            "execution_id": execution_id,
            "scraping_details": {
                "url": source_url,
                "scraped_at": scrape_response.scraped_at.isoformat(),
                "total_items_found": scrape_response.total_items
            }
        }
        
    except HTTPException as e:
        if conn:
            conn.rollback()
        execution_duration = int((datetime.now() - execution_start).total_seconds() * 1000)
        log_execution(conn, task_id, execution_id, 'failed', 'error', 
                     f'Task execution failed: {e.detail}', 
                     {'error_detail': e.detail}, 
                     execution_duration_ms=execution_duration)
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        execution_duration = int((datetime.now() - execution_start).total_seconds() * 1000)
        error_traceback = traceback.format_exc()
        log_execution(conn, task_id, execution_id, 'failed', 'error', 
                     f'Task execution failed with exception: {str(e)}', 
                     {'exception_type': type(e).__name__}, 
                     error_traceback=error_traceback,
                     execution_duration_ms=execution_duration)
        raise HTTPException(status_code=500, detail=f"Task execution failed: {str(e)}")
    finally:
        if conn:
            conn.close()

# Alias for backward compatibility with worker.py
execute_task = _execute_task_internal

@router.post("/execute-task/{task_id}")
async def execute_task_endpoint(task_id: int):
    """Enqueue a task to Kafka for execution by the worker."""
    conn = None
    try:
        conn, cur = get_db_cursor()
        
        # Verify task exists
        cur.execute("""
            SELECT t.id, t.task_name, em.entity_name
            FROM tasks t
            JOIN entity_mappings em ON t.mapping_id = em.id
            WHERE t.id = %s
        """, (task_id,))
        
        task_data = cur.fetchone()
        if not task_data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task_name = task_data[1]
        entity_name = task_data[2]
        cur.close()

        # Enqueue task to Kafka instead of executing directly
        enqueue_task(task_id)

        # To avoid duplicate immediate executions when the scheduler also has
        # a job scheduled for this task, remove the scheduler job (if any)
        # and reschedule the next occurrence when applicable. This makes
        # manual execute behave like a one-off run while preserving the
        # repeating schedule.
        try:
            job_id = str(task_id)
            try:
                if scheduler.get_job(job_id):
                    scheduler.remove_job(job_id)
            except Exception:
                # If scheduler isn't running in this process or job not found,
                # ignore and continue.
                pass

            # Fetch current repeat and scheduled_time and reschedule next occurrence
            conn2, cur2 = get_db_cursor()
            try:
                cur2.execute("SELECT repeat, scheduled_time FROM tasks WHERE id = %s", (task_id,))
                row = cur2.fetchone()
                if row:
                    repeat, scheduled_time = row[0], row[1]
                    next_time = get_next_scheduled_time(repeat, scheduled_time)
                    if next_time:
                        cur2.execute("UPDATE tasks SET scheduled_time = %s WHERE id = %s", (next_time, task_id))
                        conn2.commit()
                        try:
                            scheduler.add_job(
                                lambda t=task_id: enqueue_and_reschedule(t),
                                'date',
                                id=job_id,
                                replace_existing=True,
                                run_date=next_time
                            )
                        except Exception:
                            pass
            finally:
                try:
                    cur2.close()
                except Exception:
                    pass
                try:
                    conn2.close()
                except Exception:
                    pass
        except Exception:
            # Non-fatal: don't block the API response if scheduler update fails
            pass

        return {
            "success": True,
            "task_id": task_id,
            "task_name": task_name,
            "entity_name": entity_name,
            "message": f"Task '{task_name}' has been queued for execution in Kafka",
            "queued": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enqueue task: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.get("/task-execution-history/{task_id}")
async def get_task_execution_history(task_id: int):
    """Get execution history for a specific task."""
    try:
        conn, cur = get_db_cursor()
        
        # Get task info
        cur.execute("""
            SELECT 
                t.id,
                t.task_name,
                s.name as source_name,
                em.entity_name,
                t.created_at,
                t.scheduled_time,
                t.repeat,
                t.last_executed_at,
                t.max_items
                
            FROM tasks t
            JOIN sources s ON t.source_id = s.id
            JOIN entity_mappings em ON t.mapping_id = em.id
            WHERE t.id = %s
        """, (task_id,))
        
        task_info = cur.fetchone()
        if not task_info:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Get count of records in entity table (as a simple execution indicator)
        entity_name = task_info[3]
        cur.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(entity_name)))
        record_count = cur.fetchone()[0]
        
        cur.close()
        
        return {
            "task_id": task_info[0],
            "task_name": task_info[1],
            "source_name": task_info[2],
            "entity_name": task_info[3],
            "created_at": task_info[4],
            "scheduled_time": task_info[5],
            "repeat": task_info[6],
            "last_executed_at": task_info[7],
            "max_items": task_info[8],
            "current_record_count": record_count
            
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get execution history: {str(e)}")

@router.get("/task-execution-logs/{task_id}")
async def get_task_execution_logs(task_id: int, execution_id: str = None, limit: int = 1000):
    """Get detailed execution logs for a specific task. Optionally filter by execution_id."""
    try:
        conn, cur = get_db_cursor()
        
        # Verify task exists
        cur.execute("SELECT id, task_name FROM tasks WHERE id = %s", (task_id,))
        task = cur.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Build query
        if execution_id:
            cur.execute("""
                SELECT 
                    id, execution_id, status, log_level, message, details, 
                    error_traceback, created_at, execution_duration_ms
                FROM task_execution_logs
                WHERE task_id = %s AND execution_id = %s
                ORDER BY created_at ASC
                LIMIT %s
            """, (task_id, execution_id, limit))
        else:
            cur.execute("""
                SELECT 
                    id, execution_id, status, log_level, message, details, 
                    error_traceback, created_at, execution_duration_ms
                FROM task_execution_logs
                WHERE task_id = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (task_id, limit))
        
        logs = []
        for row in cur.fetchall():
            logs.append({
                "id": row[0],
                "execution_id": row[1],
                "status": row[2],
                "log_level": row[3],
                "message": row[4],
                "details": row[5] if row[5] else {},
                "error_traceback": row[6],
                "created_at": row[7].isoformat() if row[7] else None,
                "execution_duration_ms": row[8]
            })
        
        # Get unique execution IDs for this task
        cur.execute("""
            SELECT DISTINCT execution_id, MAX(created_at) as last_log_time
            FROM task_execution_logs
            WHERE task_id = %s
            GROUP BY execution_id
            ORDER BY last_log_time DESC
            LIMIT 50
        """, (task_id,))
        
        executions = []
        for row in cur.fetchall():
            executions.append({
                "execution_id": row[0],
                "last_log_time": row[1].isoformat() if row[1] else None
            })
        
        cur.close()
        
        return {
            "task_id": task_id,
            "task_name": task[1],
            "logs": logs,
            "executions": executions,
            "total_logs": len(logs)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get execution logs: {str(e)}")

@router.get("/task-execution-summary/{task_id}")
async def get_task_execution_summary(task_id: int):
    """Get summary of all executions for a task."""
    try:
        conn, cur = get_db_cursor()
        
        # Verify task exists
        cur.execute("SELECT id, task_name FROM tasks WHERE id = %s", (task_id,))
        task = cur.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Get execution summaries and mark currently running executions.
        # We consider an execution 'current' if its latest log status is
        # 'processing' or 'started'. Use a CTE to get the latest status per
        # execution_id and then aggregate.
        cur.execute("""
            WITH latest_status AS (
                SELECT DISTINCT ON (execution_id) execution_id, status, created_at
                FROM task_execution_logs
                WHERE task_id = %s
                ORDER BY execution_id, created_at DESC
            )
            SELECT 
                tel.execution_id,
                MIN(tel.created_at) as start_time,
                MAX(tel.created_at) as end_time,
                MAX(CASE WHEN tel.status = 'completed' THEN tel.created_at END) as completed_at,
                MAX(CASE WHEN tel.status = 'failed' THEN tel.created_at END) as failed_at,
                MAX(tel.execution_duration_ms) as duration_ms,
                COUNT(*) as log_count,
                COUNT(CASE WHEN tel.log_level = 'error' THEN 1 END) as error_count,
                MAX(CASE WHEN tel.status IN ('completed', 'failed') THEN tel.status END) as final_status,
                ls.status as latest_status,
                (CASE WHEN ls.status IN ('processing','started') THEN TRUE ELSE FALSE END) as is_current
            FROM task_execution_logs tel
            LEFT JOIN latest_status ls ON tel.execution_id = ls.execution_id
            WHERE tel.task_id = %s
            GROUP BY tel.execution_id, ls.status
            ORDER BY start_time DESC
            LIMIT 100
        """, (task_id, task_id))

        executions = []
        for row in cur.fetchall():
            executions.append({
                "execution_id": row[0],
                "start_time": row[1].isoformat() if row[1] else None,
                "end_time": row[2].isoformat() if row[2] else None,
                "completed_at": row[3].isoformat() if row[3] else None,
                "failed_at": row[4].isoformat() if row[4] else None,
                "duration_ms": row[5],
                "log_count": row[6],
                "error_count": row[7],
                "final_status": row[8],
                "latest_status": row[9],
                "is_current": bool(row[10])
            })
        
        cur.close()
        
        return {
            "task_id": task_id,
            "task_name": task[1],
            "executions": executions,
            "total_executions": len(executions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get execution summary: {str(e)}")

def get_source_by_url(url: str):
    """
    Get a specific source by its URL.
    """
    try:
        conn, cur = get_db_cursor()
        cur.execute("""
            SELECT id, name, url, pagination_config
            FROM sources
            WHERE url = %s;
        """, (url,))
        
        row = cur.fetchone()
        cur.close()

        if not row:
            raise HTTPException(status_code=404, detail=f"Source with URL {url} not found")

        return SourceInfo(
            id=row[0],
            name=row[1],
            url=row[2],
            pagination_config=PaginationConfig(**row[3]) if row[3] else None
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching source by URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch source: {str(e)}")
    
@router.post("/preview-mapping")
async def preview_mapping(request: PreviewMappingRequest):
    """
    General preview endpoint.
    - step = 1  → first 5 items (cheap)
    - step >= 2  → progressive pagination preview (last 5 items)
    """
    try:
        step = request.preview_step or 1

        # STEP 1 → SIMPLE PREVIEW
        if step == 1:
            scrape_request = ScrapeRequest(
                entity_name=request.entity_name,
                url=request.url,
                container_selector=request.container_selector,
                field_mappings=request.field_mappings,
                max_items=5,
                timeout=15
            )
            scrape_response = await route_scraping_request(scrape_request)

            if not scrape_response.success:
                return {
                    "success": False,
                    "message": f"Preview failed: {scrape_response.message}",
                    "data": [],
                    "total_items": 0
                }

            preview_data = scrape_response.data[:5]
            return {
                "success": True,
                "message": f"Preview successful - Page 1",
                "data": preview_data,
                "total_items": scrape_response.total_items,
                "preview_step": 1,
                "entity_name": request.entity_name,
                "url": request.url,
                "scraped_at": scrape_response.scraped_at.isoformat(),
                "page_size" :scrape_response.page_size
            }

        # STEP >= 2 → PAGINATED / NEXT PREVIEW

        source = get_source_by_url(request.url)
        if not source or not source.pagination_config:
            return {
                "success": False,
                "message": "Pagination config not found for source",
                "data": [],
                "total_items": 0
            }

        pagination_dict = source.pagination_config.model_dump()
        pagination_type = pagination_dict["type"]

        # Adjust pagination depth based on step
        if pagination_type not in ["button_click", "scroll", "ajax_click"]:
            pagination_dict["max_pages"] = step
        elif pagination_type in ["button_click", "ajax_click"]:
            pagination_dict["click_steps"] = step
        else:
            pagination_dict["scroll_steps"] = step

        scrape_request = ScrapeRequest(
            entity_name=request.entity_name,
            url=request.url,
            container_selector=request.container_selector,
            field_mappings=request.field_mappings,
            max_items=500,  # must be > 5 (500 limit for now)
            timeout=15,
            pagination_config=pagination_dict
        )
        scrape_response = await route_scraping_request(scrape_request)

        if not scrape_response.success:
            return {
                "success": False,
                "message": f"Preview failed: {scrape_response.message}",
                "data": [],
                "total_items": 0
            }
        
        # CRITICAL: always last 5 to ensure data from last page
        preview_data = scrape_response.data[-5:]

        if not preview_data:
            return {
                "success": False,
                "message": "No items found for this page",
                "data": [],
                "total_items": 0
            }

        return {
            "success": True,
            "message": f"Preview successful - Page {step}",
            "data": preview_data,
            "total_items": scrape_response.total_items,
            "preview_step": step,
            "entity_name": request.entity_name,
            "url": request.url,
            "scraped_at": scrape_response.scraped_at.isoformat(),
            "page_size" :scrape_response.page_size
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Preview error: {str(e)}",
            "data": [],
            "total_items": 0
        }

def log_quick_extract(execution_id: str, status: str, log_level: str, message: str, details: dict = None, 
                     error_traceback: str = None, execution_duration_ms: int = None):
    """Log a message for quick extract task execution."""
    log_entry = {
        "execution_id": execution_id,
        "status": status,
        "log_level": log_level,
        "message": message,
        "details": details or {},
        "error_traceback": error_traceback,
        "execution_duration_ms": execution_duration_ms,
        "created_at": datetime.now().isoformat()
    }
    # Store in memory
    with quick_extract_lock:
        if execution_id not in quick_extract_logs:
            quick_extract_logs[execution_id] = []
        quick_extract_logs[execution_id].append(log_entry)
    
    # Also store in database for cross-process access
    try:
        conn, cur = get_db_cursor()
        create_quick_extract_logs_table(conn)
        cur.execute("""
            INSERT INTO quick_extract_logs (execution_id, status, log_level, message, details, error_traceback, execution_duration_ms)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (execution_id, status, log_level, message, json.dumps(details or {}), error_traceback, execution_duration_ms))
        conn.commit()
        cur.close()
        conn.close()
        logger.debug(f"Stored log in database: execution_id={execution_id}, status={status}, message={message[:50]}")
    except Exception as e:
        logger.warning(f"Failed to store log in database: {e}", exc_info=True)

async def execute_quick_extract_task(execution_id: str, request_data: dict):
    """
    Execute a quick extract task without storing data in database.
    This is called by the worker when processing quick extract tasks from Kafka.
    """
    execution_start = datetime.now()
    
    try:
        # Initialize logs
        log_quick_extract(execution_id, "started", "info", "Task execution started", {"execution_id": execution_id})
        
        # Update status to processing
        with quick_extract_lock:
            quick_extract_results[execution_id] = {
                "status": "processing",
                "message": "Task execution started",
                "execution_id": execution_id,
                "started_at": execution_start.isoformat()
            }
        
        # Reconstruct QuickExtractRequest from request_data
        from models import FieldMapping
        from pydantic import HttpUrl
        
        log_quick_extract(execution_id, "processing", "info", "Fetching task details from request", {
            "has_url": bool(request_data.get("url")),
            "has_field_mappings": bool(request_data.get("field_mappings")),
            "has_pagination": bool(request_data.get("pagination_config")),
            "has_captcha": bool(request_data.get("captcha_params"))
        })
        
        # Convert field_mappings back to proper format
        field_mappings = {}
        for key, value in request_data.get("field_mappings", {}).items():
            if isinstance(value, dict):
                field_mappings[key] = FieldMapping(**value)
            else:
                field_mappings[key] = value
        
        log_quick_extract(execution_id, "processing", "info", "Task details retrieved successfully", {
            "url": request_data.get("url"),
            "field_mappings_count": len(field_mappings),
            "max_items": request_data.get("max_items"),
            "container_selector": request_data.get("container_selector"),
            "field_names": list(field_mappings.keys()),
            "entity_name": request_data.get("entity_name"),
            "entity_name_type": type(request_data.get("entity_name")).__name__,
            "entity_name_bool": bool(request_data.get("entity_name")),
            "source_name": request_data.get("source_name"),
            "will_store_in_db": bool(request_data.get("entity_name"))
        })
        
        # Reconstruct pagination_config if present
        pagination_config = None
        if request_data.get("pagination_config"):
            pagination_config = PaginationConfig(**request_data["pagination_config"])
            pagination_details = {
                "pagination_type": pagination_config.type,
                "start_page": pagination_config.start_page if hasattr(pagination_config, 'start_page') else 1,
            }
            if pagination_config.type == "query_param":
                pagination_details["param_name"] = pagination_config.param_name
            elif pagination_config.type == "offset":
                pagination_details["param_name"] = pagination_config.param_name
                pagination_details["page_size"] = pagination_config.page_size
                if hasattr(pagination_config, 'max_pages') and pagination_config.max_pages:
                    pagination_details["max_pages"] = pagination_config.max_pages
            elif pagination_config.type == "path":
                pagination_details["path_pattern"] = pagination_config.path_pattern
            elif pagination_config.type in ["button_click", "ajax_click"]:
                pagination_details["button_selector"] = pagination_config.button_selector
                pagination_details["wait_selector"] = pagination_config.wait_selector
            elif pagination_config.type == "scroll":
                pagination_details["scroll_steps"] = pagination_config.scroll_steps
            
            log_quick_extract(execution_id, "processing", "info", "Pagination configuration detected", pagination_details)
        else:
            log_quick_extract(execution_id, "processing", "info", "No pagination configuration - single page extraction")
        
        # Reconstruct captcha_params if present
        captcha_params = None
        if request_data.get("captcha_params"):
            captcha_params = CaptchaParams(**request_data["captcha_params"])
            log_quick_extract(execution_id, "processing", "info", "Captcha protection detected", {
                "captcha_type": getattr(captcha_params, 'captcha_type', 'unknown')
            })
        
        # Build ScrapeRequest
        scrape_request_details = {
            "entity_name": "quick_extract_task",
            "has_pagination": pagination_config is not None,
            "has_captcha": captcha_params is not None,
            "timeout": request_data.get("timeout", 15),
            "max_items": request_data.get("max_items")
        }
        if pagination_config:
            scrape_request_details["pagination_type"] = pagination_config.type
        log_quick_extract(execution_id, "processing", "info", "Building scrape request", scrape_request_details)
        scrape_request = ScrapeRequest(
            entity_name="quick_extract_task",
            url=HttpUrl(request_data["url"]),
            container_selector=request_data.get("container_selector"),
            field_mappings=field_mappings,
            max_items=request_data.get("max_items"),
            timeout=request_data.get("timeout", 15),
            pagination_config=pagination_config,
            captcha_params=captcha_params
        )
        
        # Execute scraping
        scraping_details = {
            "url": str(request_data["url"]),
            "timeout": request_data.get("timeout", 15),
            "max_items": request_data.get("max_items"),
        }
        if pagination_config:
            scraping_details["pagination_enabled"] = True
            scraping_details["pagination_type"] = pagination_config.type
        else:
            scraping_details["pagination_enabled"] = False
        
        log_quick_extract(execution_id, "processing", "info", "Starting web scraping", scraping_details)
        scrape_start = datetime.now()
        scrape_response = await route_scraping_request(scrape_request)
        scrape_duration = int((datetime.now() - scrape_start).total_seconds() * 1000)
        
        # Log scraping progress
        log_quick_extract(execution_id, "processing", "info", f"Web scraping completed in {scrape_duration}ms", {
            "scraping_duration_ms": scrape_duration,
            "scraping_success": scrape_response.success,
            "scraping_message": scrape_response.message
        })
        
        execution_duration = int((datetime.now() - execution_start).total_seconds() * 1000)
        
        if not scrape_response.success:
            log_quick_extract(execution_id, "failed", "error", f"Scraping failed: {scrape_response.message}", {
                "scraping_message": scrape_response.message,
                "scraping_duration_ms": scrape_duration
            })
            result = {
                "success": False,
                "status": "failed",
                "message": scrape_response.message,
                "execution_id": execution_id,
                "execution_duration_ms": execution_duration,
                "data": [],
                "total_items": 0,
                "url": str(scrape_response.url),
                "scraped_at": scrape_response.scraped_at.isoformat()
            }
            
            # Store failed result
            with quick_extract_lock:
                quick_extract_results[execution_id] = result
                logger.info(f"Stored failed quick extract result in memory for execution_id: {execution_id}")
            
            # Also store in database
            try:
                conn, cur = get_db_cursor()
                create_quick_extract_results_table(conn)
                cur.execute("""
                    INSERT INTO quick_extract_results 
                    (execution_id, status, success, message, data, total_items, items_scraped, url, scraped_at, execution_duration_ms, error, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (execution_id) 
                    DO UPDATE SET 
                        status = EXCLUDED.status,
                        success = EXCLUDED.success,
                        message = EXCLUDED.message,
                        data = EXCLUDED.data,
                        total_items = EXCLUDED.total_items,
                        items_scraped = EXCLUDED.items_scraped,
                        url = EXCLUDED.url,
                        scraped_at = EXCLUDED.scraped_at,
                        execution_duration_ms = EXCLUDED.execution_duration_ms,
                        error = EXCLUDED.error,
                        updated_at = NOW()
                """, (
                    execution_id,
                    result['status'],
                    result['success'],
                    result.get('message'),
                    json.dumps(result.get('data', [])),
                    result.get('total_items', 0),
                    result.get('items_scraped', 0),
                    result.get('url'),
                    result.get('scraped_at'),
                    result.get('execution_duration_ms', 0),
                    result.get('error')
                ))
                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                logger.error(f"Failed to store failed result in database: {e}")
        else:
            items_count = len(scrape_response.data) if scrape_response.data else 0
            log_quick_extract(execution_id, "processing", "info", "Scraping completed successfully", {
                "items_scraped": items_count,
                "total_items_found": scrape_response.total_items,
                "scraping_duration_ms": scrape_duration,
                "url": str(scrape_response.url),
                "scraped_at": scrape_response.scraped_at.isoformat() if scrape_response.scraped_at else None
            })
            
            # Store data in database if entity_name is provided
            entity_name = request_data.get("entity_name")
            # Normalize entity_name - strip whitespace and handle empty strings
            if entity_name:
                entity_name = str(entity_name).strip()
                if not entity_name:
                    entity_name = None
            
            source_name = request_data.get("source_name", "Quick Extract")
            items_stored = 0
            items_failed = 0
            upsert_errors = []
            
            log_quick_extract(execution_id, "processing", "info", "Checking if data should be stored in database", {
                "entity_name": entity_name,
                "entity_name_raw": request_data.get("entity_name"),
                "entity_name_type": type(entity_name).__name__ if entity_name else "None",
                "has_entity_name": bool(entity_name),
                "has_scraped_data": bool(scrape_response.data),
                "items_count": items_count if scrape_response.data else 0,
                "will_store": bool(entity_name and scrape_response.data),
                "source_name": source_name
            })
            
            if entity_name and scrape_response.data:
                try:
                    conn, cur = get_db_cursor()
                    log_quick_extract(execution_id, "processing", "info", f"Retrieving entity table structure for {entity_name}", {
                        "entity_name": entity_name
                    })
                    
                    # Get entity table structure
                    # PostgreSQL stores unquoted table names in lowercase, so we need to check both
                    # First try exact match, then try lowercase
                    cur.execute("""
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE (table_name = %s OR LOWER(table_name) = LOWER(%s))
                        AND column_name != 'id'
                        ORDER BY ordinal_position
                    """, (entity_name, entity_name))
                    
                    table_columns = {row[0]: row[1] for row in cur.fetchall()}
                    
                    # If no columns found with case-insensitive match, try to find the actual table name
                    if not table_columns:
                        # Try to find the table with case-insensitive search
                        cur.execute("""
                            SELECT table_name 
                            FROM information_schema.tables 
                            WHERE LOWER(table_name) = LOWER(%s)
                            AND table_schema = 'public'
                        """, (entity_name,))
                        actual_table = cur.fetchone()
                        if actual_table:
                            actual_table_name = actual_table[0]
                            log_quick_extract(execution_id, "processing", "info", f"Found table with different case: '{actual_table_name}' (requested: '{entity_name}')", {
                                "requested_name": entity_name,
                                "actual_name": actual_table_name
                            })
                            # Retry with actual table name
                            cur.execute("""
                                SELECT column_name, data_type 
                                FROM information_schema.columns 
                                WHERE table_name = %s 
                                AND column_name != 'id'
                                ORDER BY ordinal_position
                            """, (actual_table_name,))
                            table_columns = {row[0]: row[1] for row in cur.fetchall()}
                            entity_name = actual_table_name  # Use the actual table name for upsert
                    
                    if not table_columns:
                        log_quick_extract(execution_id, "processing", "warning", f"Entity table '{entity_name}' not found or has no columns. Data will not be stored.", {
                            "entity_name": entity_name,
                            "searched_name": request_data.get("entity_name")
                        })
                    else:
                        log_quick_extract(execution_id, "processing", "info", "Entity table structure retrieved", {
                            "table_name": entity_name,
                            "column_count": len(table_columns),
                            "columns": list(table_columns.keys())
                        })
                        
                        # Insert / Update scraped data in the entity table
                        log_quick_extract(execution_id, "processing", "info", "Starting to upsert scraped data into database", {
                            "total_items_to_store": items_count,
                            "entity_name": entity_name,
                            "source_name": source_name
                        })
                        
                        # Insert/Update scraped data
                        for idx, item in enumerate(scrape_response.data):
                            # Map scraped data to table columns
                            # Try exact match first, then case-insensitive match
                            insert_data = {}
                            for col in table_columns.keys():
                                # Try exact match
                                if col in item:
                                    insert_data[col] = item[col]
                                else:
                                    # Try case-insensitive match
                                    matched_key = None
                                    for key in item.keys():
                                        if key.lower() == col.lower():
                                            matched_key = key
                                            break
                                    if matched_key:
                                        insert_data[col] = item[matched_key]
                                    else:
                                        # Column not found in scraped data, set to None
                                        insert_data[col] = None
                            
                            # Log first item for debugging
                            if idx == 0:
                                log_quick_extract(execution_id, "processing", "debug", "Mapping scraped data to entity columns", {
                                    "scraped_data_keys": list(item.keys()),
                                    "entity_columns": list(table_columns.keys()),
                                    "mapped_data_keys": list(insert_data.keys()),
                                    "has_data": any(v is not None for v in insert_data.values())
                                })
                            
                            try:
                                await upsert_entity_record(cur, entity_name, source_name, insert_data)
                                items_stored += 1
                                # Log progress every 5 items for more frequent updates
                                if (idx + 1) % 5 == 0 or (idx + 1) == items_count:
                                    log_quick_extract(execution_id, "processing", "debug", f"Upserted {idx + 1}/{items_count} items", {
                                        "items_stored": items_stored,
                                        "items_failed": items_failed,
                                        "progress_percent": round((idx + 1) / items_count * 100, 1) if items_count > 0 else 0
                                    })
                            except Exception as e:
                                items_failed += 1
                                error_msg = str(e)
                                upsert_errors.append({'item_index': idx, 'error': error_msg})
                                # Rollback the connection so subsequent commands (like logging) are allowed
                                try:
                                    conn.rollback()
                                except Exception:
                                    pass
                                log_quick_extract(execution_id, "error", "error", f"Error upserting row {idx + 1}: {error_msg}", {
                                    "item_index": idx,
                                    "error": error_msg,
                                    "item_data": {k: str(v)[:100] for k, v in item.items()}
                                })
                                continue
                        
                        conn.commit()
                        cur.close()
                        conn.close()
                        
                        log_quick_extract(execution_id, "processing", "info", "Data upsert completed and committed", {
                            "items_stored": items_stored,
                            "items_failed": items_failed,
                            "total_items": items_count,
                            "success_rate": round((items_stored / items_count * 100), 1) if items_count > 0 else 0,
                            "entity_name": entity_name
                        })
                        
                        # Verify data was stored by checking the table
                        if items_stored > 0:
                            try:
                                verify_conn, verify_cur = get_db_cursor()
                                verify_cur.execute(
                                    sql.SQL("SELECT COUNT(*) FROM {} WHERE source = %s").format(
                                        sql.Identifier(entity_name)
                                    ), (source_name,))
                                stored_count = verify_cur.fetchone()[0]
                                verify_cur.close()
                                verify_conn.close()
                                log_quick_extract(execution_id, "processing", "info", f"Verified {stored_count} records in database for entity '{entity_name}' with source '{source_name}'", {
                                    "entity_name": entity_name,
                                    "source_name": source_name,
                                    "stored_count": stored_count,
                                    "expected_count": items_stored
                                })
                            except Exception as verify_err:
                                log_quick_extract(execution_id, "processing", "warning", f"Could not verify stored records: {str(verify_err)}", {
                                    "error": str(verify_err)
                                })
                except Exception as e:
                    log_quick_extract(execution_id, "error", "error", f"Failed to store data in database: {str(e)}", {
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "entity_name": entity_name
                    }, error_traceback=traceback.format_exc())
            
            # Add pagination summary if pagination was used
            if pagination_config:
                estimated_pages = None
                if items_count > 0 and pagination_config.type == "offset" and hasattr(pagination_config, 'page_size') and pagination_config.page_size:
                    estimated_pages = (items_count // pagination_config.page_size) + (1 if items_count % pagination_config.page_size > 0 else 0)
                
                pagination_summary = {
                    "pagination_type": pagination_config.type,
                    "items_scraped": items_count,
                }
                if estimated_pages:
                    pagination_summary["estimated_pages_processed"] = estimated_pages
                
                log_quick_extract(execution_id, "processing", "info", f"Pagination completed. Scraped {items_count} items across pages.", pagination_summary)
            
            completion_message = f"Task execution completed successfully"
            if entity_name and items_stored > 0:
                completion_message += f". Stored {items_stored} items in '{entity_name}' table."
            else:
                completion_message += f". Scraped {items_count} items."
            
            log_quick_extract(execution_id, "completed", "info", completion_message, {
                "items_scraped": items_count,
                "items_stored": items_stored if entity_name else 0,
                "items_failed": items_failed if entity_name else 0,
                "total_items": scrape_response.total_items,
                "total_execution_duration_ms": execution_duration,
                "scraping_duration_ms": scrape_duration,
                "url": str(scrape_response.url),
                "entity_name": entity_name,
                "source_name": source_name if entity_name else None,
                "success": True
            }, execution_duration_ms=execution_duration)
            result = {
                "success": True,
                "status": "completed",
                "message": completion_message,
                "execution_id": execution_id,
                "execution_duration_ms": execution_duration,
                "data": scrape_response.data or [],
                "total_items": scrape_response.total_items,
                "url": str(scrape_response.url),
                "scraped_at": scrape_response.scraped_at.isoformat(),
                "items_scraped": items_count,
                "items_stored": items_stored if entity_name else 0,
                "entity_name": entity_name
            }
        
        # Store result - CRITICAL: Must store before returning
        # Store in memory
        with quick_extract_lock:
            quick_extract_results[execution_id] = result
            logger.info(f"Stored quick extract result in memory for execution_id: {execution_id}, status: {result['status']}, success: {result['success']}")
        
        # Also store in database for cross-process access
        try:
            conn, cur = get_db_cursor()
            create_quick_extract_results_table(conn)
            cur.execute("""
                INSERT INTO quick_extract_results 
                (execution_id, status, success, message, data, total_items, items_scraped, url, scraped_at, execution_duration_ms, error, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (execution_id) 
                DO UPDATE SET 
                    status = EXCLUDED.status,
                    success = EXCLUDED.success,
                    message = EXCLUDED.message,
                    data = EXCLUDED.data,
                    total_items = EXCLUDED.total_items,
                    items_scraped = EXCLUDED.items_scraped,
                    url = EXCLUDED.url,
                    scraped_at = EXCLUDED.scraped_at,
                    execution_duration_ms = EXCLUDED.execution_duration_ms,
                    error = EXCLUDED.error,
                    updated_at = NOW()
            """, (
                execution_id,
                result['status'],
                result['success'],
                result.get('message'),
                json.dumps(result.get('data', [])),
                result.get('total_items', 0),
                result.get('items_scraped', 0),
                result.get('url'),
                result.get('scraped_at'),
                result.get('execution_duration_ms', 0),
                result.get('error')
            ))
            conn.commit()
            cur.close()
            conn.close()
            logger.info(f"Stored quick extract result in database for execution_id: {execution_id}")
        except Exception as e:
            logger.error(f"Failed to store result in database: {e}", exc_info=True)
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        execution_duration = int((datetime.now() - execution_start).total_seconds() * 1000)
        error_traceback = traceback.format_exc()
        
        log_quick_extract(execution_id, "failed", "error", f"Quick extract task failed: {error_msg}", {
            "error": error_msg,
            "exception_type": type(e).__name__
        }, error_traceback=error_traceback, execution_duration_ms=execution_duration)
        
        result = {
            "success": False,
            "status": "failed",
            "message": f"Quick extract task failed: {error_msg}",
            "execution_id": execution_id,
            "execution_duration_ms": execution_duration,
            "data": [],
            "total_items": 0,
            "error": error_msg
        }
        
        with quick_extract_lock:
            quick_extract_results[execution_id] = result
            logger.info(f"Stored exception result in memory for execution_id: {execution_id}")
        
        # Also store in database
        try:
            conn, cur = get_db_cursor()
            create_quick_extract_results_table(conn)
            cur.execute("""
                INSERT INTO quick_extract_results 
                (execution_id, status, success, message, data, total_items, items_scraped, url, scraped_at, execution_duration_ms, error, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (execution_id) 
                DO UPDATE SET 
                    status = EXCLUDED.status,
                    success = EXCLUDED.success,
                    message = EXCLUDED.message,
                    data = EXCLUDED.data,
                    total_items = EXCLUDED.total_items,
                    items_scraped = EXCLUDED.items_scraped,
                    url = EXCLUDED.url,
                    scraped_at = EXCLUDED.scraped_at,
                    execution_duration_ms = EXCLUDED.execution_duration_ms,
                    error = EXCLUDED.error,
                    updated_at = NOW()
            """, (
                execution_id,
                result['status'],
                result['success'],
                result.get('message'),
                json.dumps(result.get('data', [])),
                result.get('total_items', 0),
                result.get('items_scraped', 0),
                result.get('url'),
                result.get('scraped_at'),
                result.get('execution_duration_ms', 0),
                result.get('error')
            ))
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to store exception result in database: {e}")
        
        logger.error(f"Quick extract task {execution_id} failed", exc_info=True)
        return result

def get_quick_extract_result(execution_id: str) -> Optional[dict]:
    """
    Get the result of a quick extract task by execution_id.
    Returns None if task not found or still processing.
    First checks memory, then database for cross-process access.
    """
    # First check memory
    with quick_extract_lock:
        result = quick_extract_results.get(execution_id)
        if result:
            logger.debug(f"Found result in memory for execution_id: {execution_id}, status: {result.get('status')}, success: {result.get('success')}")
            return result
    
    # If not in memory, check database (for cross-process access)
    try:
        conn, cur = get_db_cursor()
        create_quick_extract_results_table(conn)
        cur.execute("""
            SELECT status, success, message, data, total_items, items_scraped, url, scraped_at, execution_duration_ms, error
            FROM quick_extract_results
            WHERE execution_id = %s
        """, (execution_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if row:
            # Handle data - PostgreSQL JSONB returns dict/list directly, not string
            data = row[3] if row[3] else []
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except (json.JSONDecodeError, TypeError):
                    data = []
            elif not isinstance(data, (list, dict)):
                data = []
            
            result = {
                "status": row[0],
                "success": row[1],
                "message": row[2],
                "data": data,
                "total_items": row[4] or 0,
                "items_scraped": row[5] or 0,
                "url": row[6],
                "scraped_at": row[7].isoformat() if row[7] else None,
                "execution_duration_ms": row[8] or 0,
                "error": row[9],
                "execution_id": execution_id
            }
            # Also store in memory for faster access next time
            with quick_extract_lock:
                quick_extract_results[execution_id] = result
            logger.debug(f"Found result in database for execution_id: {execution_id}, status: {result.get('status')}, success: {result.get('success')}")
            return result
    except Exception as e:
        logger.error(f"Error fetching result from database: {e}", exc_info=True)
    
    logger.debug(f"No result found for execution_id: {execution_id}")
    return None

def get_quick_extract_logs(execution_id: str) -> List[dict]:
    """
    Get execution logs for a quick extract task by execution_id.
    Returns empty list if no logs found.
    First checks database (for cross-process access), then memory.
    """
    # First check database (logs are written by worker process, so they're in DB)
    try:
        conn, cur = get_db_cursor()
        create_quick_extract_logs_table(conn)  # This will add missing columns
        
        # Check if new columns exist, if not use fallback query
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quick_extract_logs' AND column_name IN ('error_traceback', 'execution_duration_ms')
        """)
        existing_columns = [row[0] for row in cur.fetchall()]
        has_error_traceback = 'error_traceback' in existing_columns
        has_execution_duration = 'execution_duration_ms' in existing_columns
        
        if has_error_traceback and has_execution_duration:
            # Use full query with all columns
            cur.execute("""
                SELECT status, log_level, message, details, error_traceback, execution_duration_ms, created_at
                FROM quick_extract_logs
                WHERE execution_id = %s
                ORDER BY created_at ASC
            """, (execution_id,))
        else:
            # Fallback query for older table structure
            cur.execute("""
                SELECT status, log_level, message, details, created_at
                FROM quick_extract_logs
                WHERE execution_id = %s
                ORDER BY created_at ASC
            """, (execution_id,))
        
        rows = cur.fetchall()
        logger.debug(f"Fetching logs for execution_id={execution_id}, found {len(rows)} rows")
        
        logs = []
        for row in rows:
            # Handle details - PostgreSQL JSONB returns dict directly, not string
            details = row[3] if len(row) > 3 and row[3] else {}
            if isinstance(details, str):
                try:
                    details = json.loads(details)
                except (json.JSONDecodeError, TypeError):
                    details = {}
            elif not isinstance(details, dict):
                details = {}
            
            # Handle different row lengths based on which query was used
            if len(row) >= 7:
                # Full query with all columns
                logs.append({
                    "execution_id": execution_id,
                    "status": row[0],
                    "log_level": row[1],
                    "message": row[2],
                    "details": details,
                    "error_traceback": row[4],
                    "execution_duration_ms": row[5],
                    "created_at": row[6].isoformat() if row[6] else None
                })
            else:
                # Fallback query without new columns
                logs.append({
                    "execution_id": execution_id,
                    "status": row[0],
                    "log_level": row[1],
                    "message": row[2],
                    "details": details,
                    "error_traceback": None,
                    "execution_duration_ms": None,
                    "created_at": row[4].isoformat() if len(row) > 4 and row[4] else None
                })
        cur.close()
        conn.close()
        
        # Store in memory for faster access
        if logs:
            with quick_extract_lock:
                quick_extract_logs[execution_id] = logs
            logger.debug(f"Retrieved {len(logs)} logs from database for execution_id={execution_id}")
        else:
            logger.debug(f"No logs found in database for execution_id={execution_id}")
        
        return logs
    except Exception as e:
        logger.error(f"Error fetching logs from database: {e}", exc_info=True)
        # Fallback to memory if database query fails
        with quick_extract_lock:
            logs = quick_extract_logs.get(execution_id, [])
            return logs
