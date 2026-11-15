export const SAMPLE_URL = "/test_transactions.csv";
export const SAMPLE_NAME = "test_transactions.csv";


export const GENERATOR_CODE = `import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
N, FRAUD_RATE = 5000, 0.05

n_fraud = int(N * FRAUD_RATE)
n_legit = N - n_fraud

# --- legitimate transactions ---
types = rng.choice(["PAYMENT", "CASH_IN", "DEBIT", "CASH_OUT", "TRANSFER"],
                   size=n_legit, p=[0.35, 0.22, 0.02, 0.28, 0.13])
big = np.isin(types, ["CASH_OUT", "TRANSFER"])
amount = np.where(big, rng.lognormal(11.5, 1.0, n_legit),   # around 100k
                        rng.lognormal(8.5, 1.0, n_legit))   # around 5k
legit = pd.DataFrame({
    "step": rng.integers(1, 744, n_legit),
    "type": types,
    "amount": amount,
    "oldbalanceOrg": amount * rng.uniform(1.5, 20, n_legit),   # sender keeps money
    "oldbalanceDest": np.where(rng.random(n_legit) < 0.4, 0,
                               rng.lognormal(12, 1.2, n_legit)),
    "isFraud": 0,
})

# --- fraudulent transactions: sender account emptied, often into an empty account ---
f_amount = rng.lognormal(12.5, 1.0, n_fraud).clip(10_000, 10_000_000)
fraud = pd.DataFrame({
    "step": rng.integers(1, 744, n_fraud),
    "type": rng.choice(["TRANSFER", "CASH_OUT"], n_fraud),
    "amount": f_amount,
    "oldbalanceOrg": f_amount,                                  # balance == amount
    "oldbalanceDest": np.where(rng.random(n_fraud) < 0.65, 0,
                               rng.lognormal(10, 1.0, n_fraud)),
    "isFraud": 1,
})

df = pd.concat([legit, fraud]).sample(frac=1, random_state=42)
df = df.sort_values("step").round(2)
df.to_csv("sample_transactions.csv", index=False)
print(len(df), "rows |", int(df.isFraud.sum()), "fraud")`;