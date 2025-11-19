from apscheduler.schedulers.background import BackgroundScheduler
from psycopg2.extras import RealDictCursor
from contextlib import asynccontextmanager
import asyncio, httpx
from routers.get_db_connection import get_db_cursor
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from kafka import KafkaProducer
import json
import os
import psycopg2
# BOOTSTRAP = "localhost:9092"
BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
DATABASE_URL = os.getenv("DATABASE_URL","postgresql://postgres:9042c98a@localhost:5432/LeadGenerationPro")
scheduler = BackgroundScheduler()
producer: KafkaProducer = None  # will initialize in startup


# def get_db_connection():
#     connection = psycopg2.connect(DATABASE_URL)
#     return connection, connection.cursor()

async def send_to_kafka(message: dict):
    """Send message to Kafka without blocking."""
    global producer
    try:
        await asyncio.to_thread(producer.send, 'scraping_tasks', message)
        print(f"Published task {message['task_id']} to Kafka")
    except Exception as e:
        print(f"Failed to publish task {message['task_id']}: {e}")

def enqueue_task(task_id: int, payload: dict = None):
    """Prepare message and send to Kafka synchronously."""
    message = {
        "task_id": task_id,
        "payload": payload or {},
        "scheduled_at": datetime.now().isoformat()
    }
    try:
        future = producer.send('scraping_tasks', message)
        record_metadata = future.get(timeout=10)
        print(f"Published task {task_id} to Kafka "
              f"(topic={record_metadata.topic}, partition={record_metadata.partition}, offset={record_metadata.offset})")
    except Exception as e:
        print(f"Failed to publish task {task_id}: {e}")

def get_next_scheduled_time(repeat: str, current_time: datetime):
    """Return the next scheduled_time based on repeat type."""
    if repeat == "once":
        return None
    if repeat == "daily":
        return current_time + timedelta(days=1)
    if repeat == "weekly":
        return current_time + timedelta(weeks=1)
    if repeat == "monthly":
        return current_time + relativedelta(months=+1)
    if repeat == "yearly":
        return current_time + relativedelta(years=+1)
    raise ValueError(f"Invalid repeat: {repeat}")

def schedule_from_db(conn):
    """Load tasks from DB and schedule them."""
    now = datetime.now()
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT id, scheduled_time, repeat FROM tasks
            WHERE scheduled_time > %s
        """, (now,))
        for row in cur.fetchall():
            tid = row["id"]
            run_at = row["scheduled_time"]
            scheduler.add_job(
                lambda t=tid: enqueue_and_reschedule(t),
                'date',
                id=str(tid),
                replace_existing=True,
                run_date=run_at
            )
            print(f"Scheduled Kafka enqueue for task {tid} at {run_at}")

def enqueue_and_reschedule(task_id: int):
    """Send task to Kafka and reschedule if repeating."""
    enqueue_task(task_id)
    
    conn, _ = get_db_cursor()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT repeat, scheduled_time FROM tasks WHERE id=%s", (task_id,))
            row = cur.fetchone()
            if not row:
                return
            repeat, scheduled_time = row["repeat"], row["scheduled_time"]
            next_time = get_next_scheduled_time(repeat, scheduled_time)
            if next_time:
                cur.execute("UPDATE tasks SET scheduled_time=%s WHERE id=%s",
                            (next_time, task_id))
                conn.commit()
                scheduler.add_job(
                    lambda t=task_id: enqueue_and_reschedule(t),
                    'date',
                    id=str(task_id),
                    replace_existing=True,
                    run_date=next_time
                )
                print(f"Rescheduled Kafka enqueue for task {task_id} at {next_time}")
    finally:
        conn.close()

# FastAPI lifespan context
@asynccontextmanager
async def task_lifespan(app):
    global producer
    # Initialize Kafka producer on startup
    producer = KafkaProducer(
        bootstrap_servers=BOOTSTRAP,
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        api_version=(2, 6, 0)
    )
    scheduler.start()
    conn, _ = get_db_cursor()
    schedule_from_db(conn)
    conn.close()
    print("Scheduler started and tasks loaded.")
    yield
    scheduler.shutdown()
    producer.close()
    print("Scheduler stopped and Kafka producer closed.")