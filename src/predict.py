import json
from pathlib import Path
import numpy as np


import pandas as pd
from xgboost import XGBClassifier

from src.features import build_features

ROOT = Path(__file__).resolve().parent.parent

_model = XGBClassifier()
_model.load_model(ROOT / "models" / "fraud_xgb.json")
_cfg = json.loads((ROOT / "models" / "config.json").read_text())

REVIEW_T = _cfg["review_threshold"]
BLOCK_T = _cfg["block_threshold"]


def decide(p: float) -> str:
    if p >= BLOCK_T:
        return "block"
    if p >= REVIEW_T:
        return "review"
    return "approve"


def predict_one(tx: dict) -> dict:
    # the model was trained only on TRANSFER and CASH_OUT (no fraud in other types)
    if tx["type"] in ("TRANSFER", "CASH_OUT"):
        X = build_features(pd.DataFrame([tx]))
        prob = float(_model.predict_proba(X)[0, 1])
    else:
        prob = 0.0
    return {"fraud_probability": round(prob, 6), "decision": decide(prob)}

def predict_batch(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    prob = np.zeros(len(out))
    mask = out["type"].isin(["TRANSFER", "CASH_OUT"]).to_numpy()
    if mask.any():
        X = build_features(out.loc[mask])
        prob[mask] = _model.predict_proba(X)[:, 1]
    out["fraud_probability"] = prob.round(6)
    out["decision"] = np.select(
        [prob >= BLOCK_T, prob >= REVIEW_T], ["block", "review"], default="approve"
    )
    return out