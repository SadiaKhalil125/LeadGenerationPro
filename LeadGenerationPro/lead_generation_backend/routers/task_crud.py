from fastapi import HTTPException
from models import TaskInfo,TaskRequest,TasksListResponse, TaskUpdateRequest
from fastapi import APIRouter
from .get_db_connection import get_db_cursor
from datetime import datetime

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