import json
import os
import sys
import asyncio
from datetime import datetime
from kafka import KafkaConsumer, KafkaProducer
from routers.task_crud import execute_task, execute_quick_extract_task
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
BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
# BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "host.docker.internal:9092")

# --- Kafka Clients ---
print(f" Worker connecting to Kafka at {BOOTSTRAP}...")

try:
    # Consumer for receiving new scraping tasks
    consumer = KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=BOOTSTRAP,
        auto_offset_reset='earliest',
        enable_auto_commit=False,  # Manual commit to prevent reruns
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
        enable_auto_commit=False,  # Manual commit to prevent reruns
        group_id='scraping-workers',
        value_deserializer=lambda v: json.loads(v.decode('utf-8')),
        max_poll_interval_ms=600000,  # Already good - 10 minutes
        
        # ADD JUST THESE 2 LINES:
        session_timeout_ms=45000,      # 45 seconds (default is 10s)
        heartbeat_interval_ms=15000    # 15 seconds (default is 3s)
    )

while True:
    try:
        for message in consumer:
            task_id = None  # Initialize task_id to ensure it's available for error logging
            try:
                task_msg = message.value
                task_id = task_msg.get("task_id")
                payload = task_msg.get("payload", {})

                if task_id:
                    # Check if this is a quick extract task
                    if payload.get("quick_extract"):
                        execution_id = payload.get("execution_id")
                        request_data = payload.get("request", {})
                        
                        if execution_id and request_data:
                            # Check if this execution has already been completed or is being processed
                            from routers.task_crud import get_quick_extract_result
                            existing_result = get_quick_extract_result(execution_id)
                            if existing_result and existing_result.get("status") in ["completed", "failed"]:
                                print(f"⏭️ Skipping already processed quick extract task {task_id} (execution_id: {execution_id}, status: {existing_result.get('status')})")
                                # Commit the message since we're skipping it (it's already been processed)
                                consumer.commit()
                                continue
                            
                            print(f"➡ Received quick extract task {task_id} (execution_id: {execution_id}).")
                            send_status_update(task_id, "processing", "Worker picked up the quick extract task.")
                            
                            try:
                                result = asyncio.run(execute_quick_extract_task(execution_id, request_data))
                                
                                # Verify result was stored
                                from routers.task_crud import get_quick_extract_result
                                stored_result = get_quick_extract_result(execution_id)
                                if stored_result:
                                    print(f"✅ Result stored successfully for execution_id: {execution_id}, status: {stored_result.get('status')}")
                                else:
                                    print(f"❌ WARNING: Result NOT found after execution for execution_id: {execution_id}")
                                
                                if result and result.get("success"):
                                    success_msg = f"Quick extract completed. Scraped {result.get('items_scraped', 0)} items."
                                    print(f" {success_msg}")
                                    send_status_update(task_id, "completed", success_msg, result)
                                else:
                                    failure_msg = f"Quick extract failed. Message: {result.get('message', 'N/A')}"
                                    print(f" {failure_msg}")
                                    send_status_update(task_id, "failed", failure_msg, result)
                                
                                # Commit message only after successful processing
                                consumer.commit()
                                print(f"✅ Committed Kafka message for task {task_id} (execution_id: {execution_id})")
                            except Exception as e:
                                print(f"❌ Error processing quick extract task {task_id}: {e}")
                                send_status_update(task_id, "failed", f"Error: {str(e)}")
                                # Don't commit on error - let it retry
                                raise
                        else:
                            print(f"Invalid quick extract task payload: missing execution_id or request")
                            send_status_update(task_id, "failed", "Invalid quick extract task payload")
                    else:
                        # Regular task execution
                        # For manual execution (negative task_id), check if already processed
                        if task_id < 0:
                            # Negative task_id indicates manual execution (quick extract or one-time task)
                            # Check if there's a recent execution for this task
                            from routers.task_crud import get_db_cursor
                            try:
                                conn, cur = get_db_cursor()
                                cur.execute("""
                                    SELECT status FROM task_executions 
                                    WHERE task_id = %s 
                                    ORDER BY created_at DESC 
                                    LIMIT 1
                                """, (task_id,))
                                row = cur.fetchone()
                                cur.close()
                                conn.close()
                                
                                if row and row[0] in ["completed", "failed"]:
                                    print(f"⏭️ Skipping already processed manual task {task_id} (status: {row[0]})")
                                    # Commit the message since we're skipping it
                                    consumer.commit()
                                    continue
                            except Exception as e:
                                print(f"⚠️ Could not check task execution status: {e}, proceeding anyway")
                        
                        print(f"➡ Received task {task_id}. Handing off to execute_task function.")
                        send_status_update(task_id, "processing", "Worker picked up the task.")

                        try:
                            result = asyncio.run(execute_task(task_id))

                            if result and result.get("success"):
                                success_msg = f"Task completed. Stored {result.get('items_stored', 0)} items."
                                print(f" {success_msg}")
                                send_status_update(task_id, "completed", success_msg, result)
                            else:
                                failure_msg = f"Task processed but failed. Message: {result.get('message', 'N/A')}"
                                print(f" {failure_msg}")
                                send_status_update(task_id, "failed", failure_msg, result)
                            
                            # Commit message only after successful processing
                            consumer.commit()
                            print(f"✅ Committed Kafka message for task {task_id}")
                        except Exception as e:
                            print(f"❌ Error processing task {task_id}: {e}")
                            send_status_update(task_id, "failed", f"Error: {str(e)}")
                            # Don't commit on error - let it retry
                            raise
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