from routers.get_db_connection import get_db_cursor
from kafka import KafkaConsumer
import json
import psycopg2
from datetime import datetime
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
KAFKA_STATUS_TOPIC = "task_status_updates"

# Use environment variable for Kafka bootstrap, default to localhost:9092 (for local execution)
# When running locally, connect to localhost:9092 (the PLAINTEXT_LOCAL listener)
# When running in K8s, use host.docker.internal:9093 (the PLAINTEXT_DOCKER listener)
BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")

def get_kafka_config():
    """Helper to generate Kafka config with SASL_SSL support."""
    config = {
        "bootstrap_servers": BOOTSTRAP,
    }
    
    security_protocol = os.getenv("KAFKA_SECURITY_PROTOCOL", "SASL_SSL")
    if security_protocol == "SASL_SSL":
        config.update({
            "security_protocol": "SASL_SSL",
            "sasl_mechanism": os.getenv("KAFKA_SASL_MECHANISM", "SCRAM-SHA-256"),
            "sasl_plain_username": os.getenv("KAFKA_SASL_USER"),
            "sasl_plain_password": os.getenv("KAFKA_SASL_PASSWORD"),
            "ssl_cafile": os.getenv("KAFKA_CA_LOCATION"),
            "ssl_check_hostname": False
        })
    return config

try:
    kafka_config = get_kafka_config()
    consumer = KafkaConsumer(
        KAFKA_STATUS_TOPIC,
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        group_id='status-updaters',
        value_deserializer=lambda v: json.loads(v.decode('utf-8')),
        **kafka_config
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
        
        # Only update last_executed_at on successful completion
        # Do NOT process 'failed' status as it may come after 'completed' status
        # due to async processing, causing the success to be overwritten
        if status == "completed":
            conn, cur = get_db_cursor()
            
            # Update last_executed_at timestamp
            cur.execute("UPDATE tasks SET last_executed_at = %s WHERE id = %s", (datetime.utcnow(), task_id))
            print(f"   -> Updated last_executed_at for task {task_id}")

            conn.commit()
            cur.close()
            conn.close()
        elif status == "failed":
            # Log failed status but don't override the completed timestamp
            print(f"   ⚠️  Task {task_id} reported failure. Check execution logs for details.")
        
    except Exception as e:
        print(f" Error processing status update: {e}")