from apscheduler.schedulers.background import BackgroundScheduler
from psycopg2.extras import RealDictCursor
from contextlib import asynccontextmanager
from datetime import datetime
import asyncio, httpx
from routers.get_db_connection import get_db_cursor

# Shared scheduler instance
scheduler = BackgroundScheduler()

# Execute a task via HTTP request
async def run_task(task_id: int):
    print(f"🚀 Task {task_id} started!")
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post(f"http://127.0.0.1:8000/task/execute-task/{task_id}")
            print(f"[{datetime.now()}] Ran task {task_id}: {r.status_code}")
        except Exception as e:
            print(f"Error executing task {task_id}: {e}")

# Load tasks from DB at startup
def schedule_from_db(conn):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id, scheduled_time FROM tasks WHERE scheduled_time > NOW()")
        for row in cur.fetchall():
            tid, run_at = row["id"], row["scheduled_time"]
            scheduler.add_job(
                lambda t=tid: asyncio.create_task(run_task(t)),
                "date",
                run_date=run_at,
                id=str(tid),
                replace_existing=True
            )
            print(f"Scheduled task {tid} for {run_at}")

# Lifespan context for FastAPI
@asynccontextmanager
async def task_lifespan(app):
    scheduler.start()
    conn, _ = get_db_cursor()
    schedule_from_db(conn)
    conn.close()
    print("Scheduler started and tasks loaded.")
    yield
    scheduler.shutdown()
    print("Scheduler stopped.")
