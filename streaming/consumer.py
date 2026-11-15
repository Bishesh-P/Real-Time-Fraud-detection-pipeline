import json
import time

import requests
from kafka import KafkaConsumer

API = "http://127.0.0.1:8000/predict"
FIELDS = ["step", "type", "amount", "oldbalanceOrg", "oldbalanceDest"]

consumer = KafkaConsumer(
    "transactions",
    bootstrap_servers="localhost:9092",
    group_id="fraud-scorer",
    auto_offset_reset="earliest",
    value_deserializer=lambda b: json.loads(b.decode("utf-8")),
)

print("waiting for transactions...")
for msg in consumer:
    tx = msg.value
    t0 = time.perf_counter()
    r = requests.post(API, json={k: tx[k] for k in FIELDS}, timeout=5)
    r.raise_for_status()
    res = r.json()
    total_ms = (time.perf_counter() - t0) * 1000

    print(f"{tx['type']:9} amount={tx['amount']:>12,.2f} "
          f"p={res['fraud_probability']:.4f} -> {res['decision']:7} "
          f"actual={tx['isFraud']} api={res['latency_ms']}ms total={total_ms:.1f}ms")