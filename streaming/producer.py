import argparse
import json
import time
from pathlib import Path

import pandas as pd
from kafka import KafkaProducer

ROOT = Path(__file__).resolve().parent.parent
TOPIC = "transactions"

ap = argparse.ArgumentParser()
ap.add_argument("--rate", type=float, default=20, help="transactions per second")
ap.add_argument("--limit", type=int, default=2000, help="how many transactions to send")
args = ap.parse_args()

cols = ["step", "type", "amount", "oldbalanceOrg", "oldbalanceDest", "isFraud"]
df = pd.read_csv(ROOT / "data/raw/credit_card.csv", usecols=cols)

# same split as training: replay only the later 20% of the time range
tt = df[df["type"].isin(["TRANSFER", "CASH_OUT"])]
split_step = tt["step"].quantile(0.8)
test = df[df["step"] > split_step]
n_fraud = min(40, args.limit // 20)          # about 5% fraud in the demo stream
fraud = test[test["isFraud"] == 1].sample(n_fraud, random_state=42)
legit = test[test["isFraud"] == 0].sample(args.limit - n_fraud, random_state=42)
df = pd.concat([fraud, legit]).sort_values("step")

producer = KafkaProducer(
    bootstrap_servers="localhost:9092",
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)

for tx in df.to_dict("records"):
    producer.send(TOPIC, tx)
    time.sleep(1 / args.rate)

producer.flush()
print(f"sent {len(df)} transactions")