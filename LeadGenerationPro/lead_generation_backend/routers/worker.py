import json
import docker
import sys
import traceback
from confluent_kafka import Consumer, KafkaError, KafkaException # <-- CHANGED

KAFKA_TOPIC = "scraping_tasks"
BOOTSTRAP = "localhost:9092"
DOCKER_IMAGE = "scraping-task-runner:latest"

API_URL_FOR_CONTAINER = "http://host.docker.internal:8000"

# --- Docker Client Setup (Unchanged) ---
try:
    docker_client = docker.from_env()
    print("Connected to Docker daemon.")
    docker_client.images.get(DOCKER_IMAGE)
    print(f"Found Docker image: {DOCKER_IMAGE}")
except docker.errors.ImageNotFound:
    print(f"Docker image '{DOCKER_IMAGE}' not found. Please build it first.")
    sys.exit(1)
except Exception as e:
    print(f"Failed to connect to Docker daemon: {e}")
    sys.exit(1)

# --- Kafka Consumer Setup (CHANGED) ---
# Configuration for the Confluent Kafka consumer
conf = {
    'bootstrap.servers': BOOTSTRAP,
    'group.id': 'task-consumers-docker', # Can be the same group.id
    'auto.offset.reset': 'earliest'
}

try:
    # Create the consumer instance
    consumer = Consumer(conf)
    # Subscribe to the topic
    consumer.subscribe([KAFKA_TOPIC])
    print("Worker started, listening for tasks to launch as containers...")

except Exception as e:
    print(f"Failed to create KafkaConsumer: {e}")
    traceback.print_exc()
    sys.exit(1)


# --- Main Polling Loop (CHANGED) ---
try:
    while True:
        # The poll() method is the core of the consumer loop
        msg = consumer.poll(timeout=1.0) # Poll for 1 second

        if msg is None:
            # No message received, continue polling
            continue

        if msg.error():
            # Handle errors
            if msg.error().code() == KafkaError._PARTITION_EOF:
                # End of partition event, not necessarily an error
                sys.stderr.write('%% %s [%d] reached end at offset %d\n' %
                                 (msg.topic(), msg.partition(), msg.offset()))
            elif msg.error():
                # Actual error
                raise KafkaException(msg.error())
        else:
            # Proper message received
            try:
                data = json.loads(msg.value().decode('utf-8'))
                task_id = data.get("task_id")
                if not task_id:
                    print("Skipping message with no task_id.")
                    continue

                print(f"➡ Received task {task_id}. Launching container...")
                
                # --- Docker Launch Logic (Unchanged) ---
                try:
                    container = docker_client.containers.run(
                        DOCKER_IMAGE,
                        command=str(task_id),
                        detach=True,
                        remove=True,
                        environment={"API_URL": API_URL_FOR_CONTAINER},
                        extra_hosts={"host.docker.internal": "host-gateway"}
                    )
                    print(f"Launched container {container.short_id} for task {task_id}")

                except Exception as docker_err:
                    print(f"Failed to launch container for task {task_id}: {docker_err}")
                    traceback.print_exc()

            except json.JSONDecodeError:
                print(f"Could not decode message value: {msg.value()}")
            except Exception as processing_err:
                print(f"Error processing message: {processing_err}")
                traceback.print_exc()

except KeyboardInterrupt:
    print(" Canceled by user")
finally:
    # Cleanly close the consumer on exit
    consumer.close()
    print("Kafka consumer closed.")