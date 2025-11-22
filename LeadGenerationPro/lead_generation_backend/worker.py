import json
import os
import sys
import asyncio
from datetime import datetime
from kafka import KafkaConsumer, KafkaProducer
from routers.task_crud import execute_task
import httpx
sys.path.append('/app')


try:
    
    
    print("✅ Successfully imported 'execute_task' function.")
except ImportError as e:
    print(f"❌ CRITICAL: Failed to import 'execute_task': {e}")
    print("   Ensure 'task_crud.py' and all its dependencies (models, routers, etc.) are in the '/app' directory inside the container.")
    sys.exit(1)


# --- Configuration ---
KAFKA_TOPIC = "scraping_tasks"
KAFKA_STATUS_TOPIC = "task_status_updates"
# BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")

# --- Kafka Clients ---
print(f" Worker connecting to Kafka at {BOOTSTRAP}...")

try:
    # Consumer for receiving new scraping tasks
    consumer = KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=BOOTSTRAP,
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        group_id='scraping-workers',
        value_deserializer=lambda v: json.loads(v.decode('utf-8')),
        max_poll_interval_ms=600000
    )

    # Producer for sending status updates
    status_producer = KafkaProducer(
        bootstrap_servers=BOOTSTRAP,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    print("Kafka clients connected successfully.")
except Exception as e:
    print(f"CRITICAL: Could not connect to Kafka: {e}")
    sys.exit(1)


def send_status_update(task_id: int, status: str, message: str, data: dict = None):
    """Helper function to send a JSON status update to the status Kafka topic."""
    try:
        update = {
            "task_id": task_id,
            "status": status,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data or {}
        }
        status_producer.send(KAFKA_STATUS_TOPIC, update)
        print(f"Status update sent for task {task_id}: {status}")
    except Exception as e:
        print(f"Could not send status update for task {task_id}: {e}")


# --- Main Processing Loop ---
print(f" Worker is now running and waiting for tasks on topic '{KAFKA_TOPIC}'...")

# Make the consumer loop resilient on Windows where kafka-python sometimes
# raises ValueError: Invalid file descriptor: -1 from selectors.unregister
def create_consumer():
    return KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=BOOTSTRAP,
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        group_id='scraping-workers',
        value_deserializer=lambda v: json.loads(v.decode('utf-8')),
        max_poll_interval_ms=600000
    )

while True:
    try:
        for message in consumer:
            task_id = None  # Initialize task_id to ensure it's available for error logging
            try:
                task_msg = message.value
                task_id = task_msg.get("task_id")

                if task_id:
                    print(f"➡ Received task {task_id}. Handing off to execute_task function.")
                    send_status_update(task_id, "processing", "Worker picked up the task.")

                    result = asyncio.run(execute_task(task_id))

                    if result and result.get("success"):
                        success_msg = f"Task completed. Stored {result.get('items_stored', 0)} items."
                        print(f" {success_msg}")
                        send_status_update(task_id, "completed", success_msg, result)
                    else:
                        failure_msg = f"Task processed but failed. Message: {result.get('message', 'N/A')}"
                        print(f" {failure_msg}")
                        send_status_update(task_id, "failed", failure_msg, result)
                else:
                    print(f"Received message without a 'task_id': {task_msg}")

            except json.JSONDecodeError:
                print(f" Could not decode message from Kafka: {message.value}")
            except Exception as e:
                error_message = f"An unexpected error occurred: {str(e)}"
                print(f" {error_message} while processing task {task_id or 'unknown'}")
                if task_id:
                    send_status_update(task_id, "failed", error_message)

    except ValueError as ve:
        # This commonly occurs on Windows when an underlying socket is closed
        # and the selector tries to unregister an invalid fd (-1). Recover by
        # closing and recreating the consumer, then continue processing.
        print(f"Warning: caught ValueError in consumer loop: {ve}. Recreating consumer and retrying...")
        try:
            consumer.close()
        except Exception:
            pass
        # Recreate consumer and continue the outer loop
        try:
            consumer = create_consumer()
            print("Recreated Kafka consumer successfully.")
            continue
        except Exception as e:
            print(f"CRITICAL: Failed to recreate Kafka consumer: {e}")
            # wait briefly before retrying to avoid tight loop
            import time
            time.sleep(5)
            continue

    except Exception as e:
        # Catch-all to avoid the worker dying from transient errors
        print(f"Unexpected error in consumer loop: {e}. Sleeping briefly before retrying...")
        try:
            consumer.close()
        except Exception:
            pass
        import time
        time.sleep(5)
        try:
            consumer = create_consumer()
        except Exception as e2:
            print(f"Failed to recreate consumer after error: {e2}")
            time.sleep(5)
        continue