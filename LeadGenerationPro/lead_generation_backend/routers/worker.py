import json
from kafka import KafkaConsumer
import requests
import sys
import traceback

KAFKA_TOPIC = "scraping_tasks"
BOOTSTRAP = "localhost:9092"


try:
    consumer = KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=BOOTSTRAP,
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        group_id='task-consumers',
        value_deserializer=lambda v: json.loads(v.decode('utf-8'))
    )
except Exception as e:
    print(f"❌ Failed to create KafkaConsumer: {e}")
    traceback.print_exc()
    sys.exit(1)

print("✅ Worker started, listening for tasks...")

while True:
    try:
        for msg in consumer:
            try:
                data = msg.value
                task_id = data.get("task_id")
                payload = data.get("payload", {})
                print(f"➡ Got task {task_id} from Kafka with payload {payload}")

                try:
                    r = requests.post(f"http://127.0.0.1:8000/task/execute-task/{task_id}", timeout=60)
                    print(f"✅ Executed task {task_id}: {r.status_code}")
                except requests.RequestException as req_err:
                    print(f"❌ HTTP request failed for task {task_id}: {req_err}")
                    traceback.print_exc()

            except Exception as inner_msg_err:
                print(f"❌ Error processing Kafka message: {inner_msg_err}")
                traceback.print_exc()

    except Exception as consumer_err:
        print(f"❌ KafkaConsumer error: {consumer_err}")
        traceback.print_exc()
