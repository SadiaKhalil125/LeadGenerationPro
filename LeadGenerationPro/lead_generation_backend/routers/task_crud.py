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

logger = logging.getLogger(__name__)

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


@router.post("/preview-mapping")
async def preview_mapping(request: PreviewMappingRequest):
    """Preview scraping results for a mapping configuration without saving."""
    try:
        # Build ScrapeRequest from the preview request
        scrape_request = ScrapeRequest(
            entity_name=request.entity_name,
            url=request.url,
            container_selector=request.container_selector,
            field_mappings=request.field_mappings,
            max_items=5,  # Limit to 5 items for preview
            timeout=15
        )
        
        # Execute scraping using the dynamic scraper
        scrape_response = await route_scraping_request(scrape_request)
        
        if not scrape_response.success:
            return {
                "success": False,
                "message": f"Preview failed: {scrape_response.message}",
                "data": [],
                "total_items": 0
            }
        
        # Limit to first 5 items for preview
        preview_data = scrape_response.data[:5] if scrape_response.data else []
        
        return {
            "success": True,
            "message": f"Preview successful - showing first {len(preview_data)} items",
            "data": preview_data,
            "total_items": scrape_response.total_items,
            "entity_name": request.entity_name,
            "url": request.url,
            "scraped_at": scrape_response.scraped_at.isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Preview error: {str(e)}",
            "data": [],
            "total_items": 0
        }

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
    
@router.post("/preview-next-mapping")
async def preview_next_mapping(request: PreviewMappingRequest):
    """Preview next page/scroll scraping results for a mapping configuration without saving."""
    try:
        source=get_source_by_url(request.url)
        if source is None: #abhi k liye (not actually needed)
            return {
            "success": False,
            "message": f"Next Preview failed: Source not found for URL {request.url}",
            "data": [],
            "total_items": 0
        }

        # Take a dict copy
        pagination_dict = source.pagination_config.model_dump()  # All fields included


        print ("Pagination:", pagination_dict["type"], ", Source:", source.name)
       
        if pagination_dict is None:
            return {
            "success": False,
            "message": f"Next Preview failed: No pagination config found for source {source.get('name')}",
            "data": [],
            "total_items": 0
        }
        
        # Prepare modified pagination config for preview
        if pagination_dict["type"] not in ["button_click","scroll","ajax_click"]:
            pagination_dict["max_pages"] = 2
        elif pagination_dict["type"] in ["button_click","ajax_click"]:
            pagination_dict["click_steps"] = 2
        else:
            pagination_dict["scroll_steps"] = 2


        # Build ScrapeRequest from the preview request
        scrape_request = ScrapeRequest(
            entity_name=request.entity_name,
            url=request.url,
            container_selector=request.container_selector,
            field_mappings=request.field_mappings,
            max_items=500,  # setting 500 items to allow next page preview
            timeout=15,
            pagination_config=pagination_dict
        )
        print ("Going to execute")
        # Execute scraping using the dynamic scraper
        scrape_response = await route_scraping_request(scrape_request)
        
        if not scrape_response.success:
            return {
                "success": False,
                "message": f"Next Preview failed: {scrape_response.message}",
                "data": [],
                "total_items": 0
            }
        
        # Limit to last 5 items for preview if next page items are coming
        preview_data = scrape_response.data[-5:] if scrape_response.data else []

        print(f"Next Preview Success - showing {len(preview_data)} items from next page")
        return {
            "success": True,
            "message": f"Next Preview Success - showing {len(preview_data)} items from next page",
            "data": preview_data,
            "total_items": scrape_response.total_items,
            "entity_name": request.entity_name,
            "url": request.url,
            "scraped_at": scrape_response.scraped_at.isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Next Preview error: {str(e)}",
            "data": [],
            "total_items": 0
        }
