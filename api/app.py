import time
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

from src.predict import predict_one

app = FastAPI(title="Fraud Detection API")


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