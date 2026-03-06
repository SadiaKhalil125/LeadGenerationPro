import json
import os
import sys
import asyncio
from datetime import datetime
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import CommitFailedError
from routers.task_crud import execute_task, execute_quick_extract_task
from api_executor import execute_api_task
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
    # UPDATED CONFIGURATION to prevent "CommitFailedError" loop
    consumer = KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=BOOTSTRAP,
        auto_offset_reset='latest',  # Don't reprocess old messages on pod restart
        enable_auto_commit=False,  # Manual commit for better control and idempotency
        group_id='scraping-workers',
        value_deserializer=lambda v: json.loads(v.decode('utf-8')),
        
        # --- CRITICAL PERFORMANCE FIXES FOR K8S ---
        max_poll_records=1,           # Only fetch 1 task at a time. Ensures we commit before fetching next.
        max_poll_interval_ms=90000000, # 25 hours. Allows long scraping tasks without getting kicked from group.
        session_timeout_ms=60000,     # 60 Seconds. Tolerates network jitter in K8s.
        heartbeat_interval_ms=10000   # 10 Seconds. Frequent heartbeats to keep connection alive.
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

while True:
    try:
        for message in consumer:
            task_id = None  # Initialize task_id to ensure it's available for error logging
            try:
                task_msg = message.value
                task_id = task_msg.get("task_id")
                payload = task_msg.get("payload", {})
                task_success = False

                if task_id:
                    try:
                        # Check if this is a quick extract task
                        if payload.get("quick_extract"):
                            execution_id = payload.get("execution_id")
                            request_data = payload.get("request", {})
                            
                            if execution_id and request_data:
                                print(f"➡ Received quick extract task {task_id} (execution_id: {execution_id}).")
                                send_status_update(task_id, "processing", "Worker picked up the quick extract task.")
                                
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
                                    task_success = True
                                else:
                                    failure_msg = f"Quick extract failed. Message: {result.get('message', 'N/A')}"
                                    print(f" {failure_msg}")
                                    send_status_update(task_id, "failed", failure_msg, result)
                            else:
                                print(f"Invalid quick extract task payload: missing execution_id or request")
                                send_status_update(task_id, "failed", "Invalid quick extract task payload")
                        else:
                            # Regular task execution - handle both web and API tasks
                            # Fetch task type from database to determine executor
                            try:
                                from routers.get_db_connection import get_db_cursor
                                conn, cur = get_db_cursor()
                                cur.execute("""
                                    SELECT source_type FROM tasks WHERE id = %s
                                """, (task_id,))
                                result_row = cur.fetchone()
                                cur.close()
                                
                                source_type = result_row[0] if result_row else 'web'
                            except Exception as db_err:
                                print(f"⚠️  Could not fetch source_type for task {task_id}, defaulting to 'web': {db_err}")
                                source_type = 'web'
                            
                            print(f"➡ Received task {task_id} (type: {source_type}). Handing off to executor.")
                            send_status_update(task_id, "processing", f"Worker picked up the task ({source_type} source).")

                            # Route to appropriate executor based on source type
                            if source_type == 'api':
                                result = asyncio.run(execute_api_task(task_id))
                            else:
                                result = asyncio.run(execute_task(task_id))

                            if result and result.get("success"):
                                # Handle both web (items_stored) and API (items_upserted) task results
                                items_count = result.get('items_upserted') or result.get('items_stored', 0)
                                success_msg = f"Task completed ({source_type}). Stored {items_count} items."
                                print(f" {success_msg}")
                                send_status_update(task_id, "completed", success_msg, result)
                                task_success = True
                            else:
                                failure_msg = f"Task processed but failed ({source_type}). Message: {result.get('message', 'N/A')}"
                                print(f" {failure_msg}")
                                send_status_update(task_id, "failed", failure_msg, result)
                    
                    except Exception as e:
                        import traceback
                        tb = traceback.format_exc()
                        err_msg = str(e) or type(e).__name__
                        print(f"❌ Exception processing task {task_id}: {err_msg}")
                        print(f"   Full traceback:\n{tb}")
                        send_status_update(task_id, "failed", f"Exception: {err_msg}")
                        task_success = False
                    
                    # Commit offset ONLY if task was successful to prevent reprocessing on failure
                    if task_success:
                        try:
                            consumer.commit()
                            print(f"✅ Committed offset for task {task_id} after successful completion")
                        except CommitFailedError:
                            print(f"⚠️  CRITICAL: CommitFailedError for task {task_id}. The group rebalanced during execution.")
                            print("    The task completed successfully, but Kafka offset could not be saved.")
                            print("    NOTE: With max_poll_records=1, this should rarely happen.")
                        except Exception as e:
                            print(f"⚠️  Failed to commit offset for task {task_id}: {e}")
                else:
                    print(f"Received message without a 'task_id': {task_msg}")
                    # Commit this message too since it's malformed and we can't process it
                    try:
                        consumer.commit()
                    except Exception:
                        pass

            except json.JSONDecodeError:
                print(f" Could not decode message from Kafka: {message.value}")
                # Try to commit anyway to move past malformed message
                try:
                    consumer.commit()
                except Exception:
                    pass
            except Exception as e:
                error_message = f"An unexpected error occurred: {str(e)}"
                print(f" {error_message} while processing task {task_id or 'unknown'}")
                if task_id:
                    send_status_update(task_id, "failed", error_message)

    except ValueError as ve:
        # This commonly occurs on Windows or when an underlying socket is closed unexpectedly
        # Recover by closing and recreating the consumer, then continue processing.
        print(f"Warning: caught ValueError in consumer loop: {ve}. Recreating consumer and retrying...")
        try:
            consumer.close()
        except Exception:
            pass
        # Recreate consumer and continue the outer loop
        try:
            consumer = KafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=BOOTSTRAP,
                auto_offset_reset='latest',
                enable_auto_commit=False,
                group_id='scraping-workers',
                value_deserializer=lambda v: json.loads(v.decode('utf-8')),
                max_poll_records=1,           # Ensure config matches initial setup
                max_poll_interval_ms=1200000,
                session_timeout_ms=60000,
                heartbeat_interval_ms=10000
            )
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
            consumer = KafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=BOOTSTRAP,
                auto_offset_reset='latest',
                enable_auto_commit=False,
                group_id='scraping-workers',
                value_deserializer=lambda v: json.loads(v.decode('utf-8')),
                max_poll_records=1,           # Ensure config matches initial setup
                max_poll_interval_ms=1200000,
                session_timeout_ms=60000,
                heartbeat_interval_ms=10000
            )
        except Exception as e2:
            print(f"Failed to recreate consumer after error: {e2}")
            time.sleep(5)
        continue