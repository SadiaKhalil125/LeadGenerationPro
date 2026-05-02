import time
import os
import json
from kafka import KafkaProducer, KafkaConsumer
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

TOPIC_NAME = "scraping_tasks"
BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP")
CA_FILE = os.getenv("KAFKA_CA_LOCATION")
SASL_USER = os.getenv("KAFKA_SASL_USER")
SASL_PASS = os.getenv("KAFKA_SASL_PASSWORD")
SASL_MECH = os.getenv("KAFKA_SASL_MECHANISM", "SCRAM-SHA-256")

print(f"Testing Kafka SASL_SSL Connection to: {BOOTSTRAP}")

# --- PRODUCER TEST ---
try:
    producer = KafkaProducer(
        bootstrap_servers=BOOTSTRAP,
        security_protocol="SASL_SSL",
        sasl_mechanism=SASL_MECH,
        sasl_plain_username=SASL_USER,
        sasl_plain_password=SASL_PASS,
        ssl_cafile=CA_FILE,
        ssl_check_hostname=False,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

    message = {"test": "Hello from Aiven SASL_SSL!", "timestamp": time.time()}
    producer.send(TOPIC_NAME, message)
    producer.flush()
    print(f"✅ Producer: Sent test message to {TOPIC_NAME}")
    producer.close()
except Exception as e:
    print(f"❌ Producer Error: {e}")

# --- CONSUMER TEST ---
print("\nStarting Consumer to listen for the message...")
try:
    consumer = KafkaConsumer(
        TOPIC_NAME,
        bootstrap_servers=BOOTSTRAP,
        security_protocol="SASL_SSL",
        sasl_mechanism=SASL_MECH,
        sasl_plain_username=SASL_USER,
        sasl_plain_password=SASL_PASS,
        ssl_cafile=CA_FILE,
        ssl_check_hostname=False,
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        group_id='test-group-sasl',
        value_deserializer=lambda v: json.loads(v.decode('utf-8')),
        consumer_timeout_ms=10000
    )

    found = False
    for message in consumer:
        print(f"✅ Got message using SASL_SSL: {message.value}")
        found = True
        break
    
    if not found:
        print("Empty: No messages received within timeout.")
    
    consumer.close()
except Exception as e:
    print(f"❌ Consumer Error: {e}")
