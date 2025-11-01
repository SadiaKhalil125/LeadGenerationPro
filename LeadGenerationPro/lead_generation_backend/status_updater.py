from routers.get_db_connection import get_db_cursor
from kafka import KafkaConsumer
import json
import psycopg2
from datetime import datetime
import os
import sys
KAFKA_STATUS_TOPIC = "task_status_updates"

BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")

# DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:9042c98a@localhost:5432/LeadGenerationPro")

try:
    consumer = KafkaConsumer(
        KAFKA_STATUS_TOPIC,
        bootstrap_servers=BOOTSTRAP,
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        group_id='status-updaters',
        value_deserializer=lambda v: json.loads(v.decode('utf-8'))
    )
    print(f"Status updater connected to Kafka at {BOOTSTRAP}, listening to {KAFKA_STATUS_TOPIC}...")
except Exception as e:
    print(f"CRITICAL: Could not connect to Kafka: {e}")
    sys.exit(1)


for message in consumer:
    try:
        status_msg = message.value
        task_id = status_msg.get("task_id")
        status = status_msg.get("status")
        
        print(f"Received status for task {task_id}: '{status}'")
        
        # We only need to act on the 'completed' status for now
        if status == "completed":
            conn, cur = get_db_cursor()
            
            # Update last_executed_at timestamp
            cur.execute("UPDATE tasks SET last_executed_at = %s WHERE id = %s", (datetime.utcnow(), task_id))
            print(f"   -> Updated last_executed_at for task {task_id}")

            conn.commit()
            cur.close()
            conn.close()
        
    except Exception as e:
        print(f" Error processing status update: {e}")