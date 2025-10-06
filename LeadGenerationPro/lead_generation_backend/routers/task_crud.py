from fastapi import HTTPException
from models import TaskInfo,TaskRequest,TasksListResponse, TaskUpdateRequest, PreviewMappingRequest
from fastapi import APIRouter
from routers.get_db_connection import get_db_cursor
from datetime import datetime
from crawl4Util import extract_website
from scraping_router import route_scraping_request 
from models import ScrapeRequest
from psycopg2 import sql
from asyncio import WindowsProactorEventLoopPolicy 
import sys
import asyncio
from datetime import datetime, timezone
import httpx
from psycopg2.extras import RealDictCursor
from routers.scheduler_config import scheduler, enqueue_and_reschedule

VALID_REPEATS = {"once", "daily", "weekly", "monthly", "yearly"}

router = APIRouter()

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
        conn.rollback()
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
    
async def upsert_entity_record(cur, entity_name: str, source_name: str, item: dict):
    """
    Upsert row on (source, name).
    """
    name_val = item.get("name")  # adjust if column is named differently

    # Ensure source & modified_at are present
    item["source"] = source_name
    item["modified_at"] = datetime.now()

    columns = list(item.keys())
    values = list(item.values())

    insert_stmt = sql.SQL("""
        INSERT INTO {} ({})
        VALUES ({})
        ON CONFLICT (source, name) DO UPDATE 
        SET {}, modified_at = NOW()
    """).format(
        sql.Identifier(entity_name),
        sql.SQL(', ').join(map(sql.Identifier, columns)),
        sql.SQL(', ').join(sql.Placeholder() * len(columns)),
        sql.SQL(', ').join(
            sql.SQL("{} = EXCLUDED.{}").format(sql.Identifier(col), sql.Identifier(col))
            for col in columns if col not in ("source", "name", "modified_at")
        )
    )


    cur.execute(insert_stmt, values)

@router.post("/execute-task/{task_id}")
async def execute_task(task_id: int):
    """Execute a task by scraping data and storing it in the corresponding entity table."""
    conn = None
    try:
        conn, cur = get_db_cursor()
        
        # Get task details with all necessary information
        cur.execute("""
            SELECT 
                t.id,
                t.task_name,
                t.source_id,
                s.name as source_name,
                s.url as source_url,
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
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Extract task information
        (task_id_db, task_name, source_id, source_name, source_url, 
         mapping_id, repeat, max_items, mapping_name, entity_name, container_selector, field_mappings) = task_data
        
        # Build ScrapeRequest from task data
        scrape_request = ScrapeRequest(
            entity_name=entity_name,
            url=source_url,
            container_selector=container_selector,
            field_mappings=field_mappings,
            max_items=max_items,  
            timeout=30  # Increased timeout for better reliability
        )
        
        # Execute scraping using the dynamic scraper (now properly async)
        scrape_response = await route_scraping_request(scrape_request)
        
        if not scrape_response.success or not scrape_response.data:
            return {
                "success": False,
                "task_id": task_id,
                "task_name": task_name,
                "message": f"Scraping failed: {scrape_response.message}",
                "items_scraped": 0,
                "items_stored": 0
            }
        
        # Get entity table structure to match fields
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = %s 
            AND column_name != 'id'
            ORDER BY ordinal_position
        """, (entity_name,))
        
        table_columns = {row[0]: row[1] for row in cur.fetchall()}
        
        if not table_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Entity table '{entity_name}' not found or has no columns"
            )
        
        # Insert / Update scraped data in the entity table
        items_stored = 0
        for item in scrape_response.data:
            insert_data = {col: item.get(col) for col in table_columns.keys()}
            try:
                await upsert_entity_record(cur, entity_name, source_name, insert_data)
                items_stored += 1
            except Exception as e:
                print(f"Error upserting row: {e}")
                continue

        # update last_executed_at timestamp
        cur.execute("""
            UPDATE tasks
            SET last_executed_at = %s
            WHERE id = %s
        """, (datetime.now(), task_id))

        conn.commit()

        # # For once-only tasks, remove job after execution        
        # job_id = str(task_id)
        # job = scheduler.get_job(job_id)
        # if repeat == "once" and job:
        #     scheduler.remove_job(job_id)
        #     print(f"Removed once-only job {job_id} after execution")

        
        return {
            "success": True,
            "task_id": task_id,
            "task_name": task_name,
            "entity_name": entity_name,
            "message": f"Task '{task_name}' executed successfully",
            "items_scraped": len(scrape_response.data),
            "items_stored": items_stored,
            "scraping_details": {
                "url": source_url,
                "scraped_at": scrape_response.scraped_at.isoformat(),
                "total_items_found": scrape_response.total_items
            }
        }
        
    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Task execution failed: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.get("/task-execution-history/{task_id}")
async def get_task_execution_history(task_id: int):
    """Get execution history for a specific task (you can extend this later)."""
    try:
        conn, cur = get_db_cursor()
        
        # For now, just return task info
        # You can extend this later to track execution history in a separate table
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
