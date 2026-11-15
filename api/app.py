import io
import os
import time
from typing import Literal

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.predict import predict_one, predict_batch

app = FastAPI(title="Fraud Detection API")

ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS,
                   allow_methods=["*"], allow_headers=["*"])

REQUIRED = ["step", "type", "amount", "oldbalanceOrg", "oldbalanceDest"]
VALID_TYPES = {"PAYMENT", "CASH_IN", "DEBIT", "CASH_OUT", "TRANSFER"}
MAX_ROWS = 200_000
MAX_BYTES = 50 * 1024 * 1024


class Transaction(BaseModel):
    step: int = Field(ge=1)
    type: Literal["PAYMENT", "CASH_IN", "DEBIT", "CASH_OUT", "TRANSFER"]
    amount: float = Field(ge=0)
    oldbalanceOrg: float = Field(ge=0)
    oldbalanceDest: float = Field(ge=0)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(tx: Transaction):
    t0 = time.perf_counter()
    result = predict_one(tx.model_dump())
    result["latency_ms"] = round((time.perf_counter() - t0) * 1000, 2)
    return result


@app.post("/predict/batch")
async def predict_file(file: UploadFile = File(...)):
    name = (file.filename or "").lower()
    if not name.endswith((".csv", ".parquet")):
        raise HTTPException(400, "Upload a .csv or .parquet file")

    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "File too large (max 50 MB)")

    try:
        buf = io.BytesIO(raw)
        df = pd.read_csv(buf) if name.endswith(".csv") else pd.read_parquet(buf)
    except Exception:
        raise HTTPException(400, "Could not read the file")

    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise HTTPException(422, f"Missing columns: {missing}")

    for c in ["step", "amount", "oldbalanceOrg", "oldbalanceDest"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=REQUIRED)
    df = df[df["type"].isin(VALID_TYPES)]
    if df.empty:
        raise HTTPException(422, "No valid rows found")

    truncated = len(df) > MAX_ROWS
    df = df.head(MAX_ROWS)
    res = predict_batch(df)

    counts = res["decision"].value_counts()
    summary = {
        "rows": int(len(res)),
        "block": int(counts.get("block", 0)),
        "review": int(counts.get("review", 0)),
        "approve": int(counts.get("approve", 0)),
    }
    if "isFraud" in res.columns:
        flagged_mask = res["decision"] != "approve"
        fraud_mask = res["isFraud"] == 1
        summary["actual_fraud"] = int(fraud_mask.sum())
        summary["fraud_caught"] = int((fraud_mask & flagged_mask).sum())
        summary["false_alarms"] = int((~fraud_mask & flagged_mask).sum())

    flagged = (res[res["decision"] != "approve"]
               .sort_values("fraud_probability", ascending=False).head(500))
    flagged = flagged.astype(object).where(flagged.notna(), None)

    return {"summary": summary, "truncated": truncated,
            "flagged": flagged.to_dict("records")}