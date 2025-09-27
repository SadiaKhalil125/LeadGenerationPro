from fastapi import HTTPException
from models import TaskInfo,TaskRequest,TasksListResponse, TaskUpdateRequest, PreviewMappingRequest
from fastapi import APIRouter
from routers.get_db_connection import get_db_cursor
from datetime import datetime
from crawl4Util import extract_website
from models import ScrapeRequest
from psycopg2 import sql
from asyncio import WindowsProactorEventLoopPolicy 
import sys
import asyncio
import httpx
from psycopg2.extras import RealDictCursor
from routers.scheduler_config import scheduler, run_task 


router = APIRouter()

@router.post("/create-task", response_model=dict)
async def create_task(request: TaskRequest):
    """Create a scheduled scraping task."""
    try:
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
        scheduler.add_job(
            lambda tid=task_id: asyncio.run(run_task(tid)),
            "date",
            run_date=request.scheduled_time,
            id=str(task_id),
            replace_existing=True
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
        conn.rollback()
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
        tid = f"task_{task_id}"
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
    
# Add this endpoint to your main.py file
@router.put("/update-task/{task_id}", response_model=dict)
async def update_task(task_id: int, request: TaskUpdateRequest):
    """Update a task's scheduled time and optionally its name."""
    try:
        conn, cur = get_db_cursor()
        # cur = conn.cursor()
        
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

        # Reschedule the job in APScheduler
        scheduler.add_job(
            lambda tid=task_id: asyncio.run(run_task(tid)),
            "date",
            run_date=request.scheduled_time,
            id=f"task_{task_id}",
            replace_existing=True
        )
        
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
         mapping_id, mapping_name, entity_name, container_selector, field_mappings) = task_data
        
        # Build ScrapeRequest from task data
        scrape_request = ScrapeRequest(
            entity_name=entity_name,
            url=source_url,
            container_selector=container_selector,
            field_mappings=field_mappings,
            max_items=None,  # You can make this configurable later
            timeout=30  # Increased timeout for better reliability
        )
        
        # Execute scraping using the dynamic scraper (now properly async)
        scrape_response = await extract_website(scrape_request)
        
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
        
        # Insert scraped data into entity table
        items_stored = 0
        for item in scrape_response.data:
            # Prepare data for insertion, matching table columns
            insert_data = {}
            for column_name in table_columns.keys():
                # Get value from scraped data, or None if not present
                insert_data[column_name] = item.get(column_name)

            # Add timestamps if the columns exist
            insert_data['modified_at'] = datetime.now()
            # Build dynamic INSERT statement
            columns = list(insert_data.keys())
            values = list(insert_data.values())
            
            if columns:  # Only insert if we have columns to insert
                insert_stmt = sql.SQL(
                    "INSERT INTO {} ({}) VALUES ({})"
                ).format(
                    sql.Identifier(entity_name),
                    sql.SQL(', ').join(map(sql.Identifier, columns)),
                    sql.SQL(', ').join(sql.Placeholder() * len(columns))
                )
                
                try:
                    cur.execute(insert_stmt, values)
                    items_stored += 1
                except Exception as e:
                    print(f"Error inserting row: {e}")
                    # Continue with next item instead of failing completely
                    continue
        
        # Commit all inserts
        conn.commit()

        tid = f"task_{task_id}"
        if scheduler.get_job(tid):
            scheduler.remove_job(tid)
        
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
                t.scheduled_time
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
        scrape_response = await extract_website(scrape_request)
        
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

# scheduler = BackgroundScheduler()

# # ---------- Scheduler helpers ----------
# async def run_task(task_id: int):
#     async with httpx.AsyncClient() as client:
#         try:
#             r = await client.post(f"http://127.0.0.1:8000/execute-task/{task_id}")
#             print(f"[{datetime.now()}] Ran task {task_id}: {r.status_code}")
#         except Exception as e:
#             print(f"Error executing task {task_id}: {e}")

# def schedule_from_db(conn):
#     """Fetch tasks from DB and schedule them."""
#     with conn.cursor(cursor_factory=RealDictCursor) as cur:
#         cur.execute("SELECT id, scheduled_time FROM tasks WHERE scheduled_time > NOW()")
#         for row in cur.fetchall():
#             tid, run_at = row["id"], row["scheduled_time"]
#             scheduler.add_job(
#                 lambda task_id=tid: asyncio.create_task(run_task(task_id)),
#                 "date",
#                 run_date=run_at,
#                 id=str(tid),
#                 replace_existing=True
#             )
#             print(f"Scheduled task {tid} for {run_at}")

# # ---------- Lifespan context to replace @app.on_event ----------
# @asynccontextmanager
# async def task_lifespan(app):
#     scheduler.start()
#     conn, _ = get_db_cursor()
#     schedule_from_db(conn)
#     conn.close()
#     print("Scheduler started and tasks loaded.")
#     yield
#     scheduler.shutdown()
#     print("Scheduler stopped.")