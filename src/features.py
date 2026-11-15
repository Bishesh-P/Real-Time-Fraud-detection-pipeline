import pandas as pd

FEATURE_COLUMNS = ["amount", "oldbalanceOrg", "oldbalanceDest", "type_TRANSFER",
                   "hourOfDay", "destWasEmpty", "amountToBalance", "drainsAccount"]

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    X = pd.DataFrame(index=df.index)
    X["amount"] = df["amount"]
    X["oldbalanceOrg"] = df["oldbalanceOrg"]
    X["oldbalanceDest"] = df["oldbalanceDest"]
    X["type_TRANSFER"] = (df["type"] == "TRANSFER").astype(int)
    X["hourOfDay"] = df["step"] % 24
    X["destWasEmpty"] = (df["oldbalanceDest"] == 0).astype(int)
    X["amountToBalance"] = df["amount"] / (df["oldbalanceOrg"] + 1)
    X["drainsAccount"] = (df["amount"] >= df["oldbalanceOrg"]).astype(int)
    return X[FEATURE_COLUMNS]