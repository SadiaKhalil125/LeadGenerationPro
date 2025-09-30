from apscheduler.schedulers.background import BackgroundScheduler
from psycopg2.extras import RealDictCursor
from contextlib import asynccontextmanager
from datetime import datetime
import asyncio, httpx
from routers.get_db_connection import get_db_cursor

# Shared scheduler instance
scheduler = BackgroundScheduler()
def get_scheduler_args(repeat: str, scheduled_time: datetime):
    """
    Return (trigger_name, kwargs) for APScheduler based on repeat value.
    """
    if repeat == "once":
        return "date", {"run_date": scheduled_time}

    if repeat == "daily":
        return "interval", {"days": 1, "start_date": scheduled_time}

    if repeat == "weekly":
        return "interval", {"weeks": 1, "start_date": scheduled_time}

    if repeat == "monthly":
        # run on same day-of-month each month
        return "cron", {
            "day": scheduled_time.day,
            "hour": scheduled_time.hour,
            "minute": scheduled_time.minute,
            "second": scheduled_time.second,
            "start_date": scheduled_time
        }

    if repeat == "yearly":
        # run on same month/day each year
        return "cron", {
            "month": scheduled_time.month,
            "day": scheduled_time.day,
            "hour": scheduled_time.hour,
            "minute": scheduled_time.minute,
            "second": scheduled_time.second,
            "start_date": scheduled_time
        }

    raise ValueError("Invalid repeat")


# Execute a task via HTTP request
async def run_task(task_id: int):
    print(f"🚀 Task {task_id} started!")
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post(f"http://127.0.0.1:8000/task/execute-task/{task_id}")
            print(f"[{datetime.now()}] Ran task {task_id}: {r.status_code}")
        except Exception as e:
            print(f"Error executing task {task_id}: {str(e)}")

# Load tasks from DB at startup
def schedule_from_db(conn):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id, scheduled_time, repeat FROM tasks")
        for row in cur.fetchall():
            tid = row["id"]
            run_at = row["scheduled_time"]
            repeat = row["repeat"]

            trigger, trigger_args = get_scheduler_args(repeat, run_at)

            scheduler.add_job(
                lambda t=tid: asyncio.create_task(run_task(t)),
                trigger,
                id=str(tid),
                replace_existing=True,
                **trigger_args
            )
            print(f"Scheduled task {tid} ({repeat}) for {run_at}")


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
