# Fraud Checker: Real-Time Fraud Detection for Money Transactions

A machine learning system that looks at a transaction and decides, in milliseconds, whether to **approve** it, send it for **review**, or **block** it. It includes a trained model, a scoring API, a web app, and a Kafka streaming pipeline.

**Live demo:** _add your link here after deploying_
**Code:** https://github.com/Bishesh-P/Real-Time-Fraud-detection-pipeline

> **Important:** the model is trained on **PaySim**, a *simulated* dataset. It is a portfolio project and must not be used for real financial decisions. See [Limitations](#limitations).

---

## In plain words

Imagine a mobile-money app. Every second, thousands of transfers and cash-outs happen. A few are theft: someone empties another person's account. By the time the theft is noticed, the money is gone.

This project learns what theft looks like from past transactions and checks each new transaction **before it is approved**. You can try it by entering one transaction or uploading a whole file.

---

## Table of contents

1. [Business need and problem statement](#1-business-need-and-problem-statement)
2. [Gathering the data](#2-gathering-the-data)
3. [Data preprocessing](#3-data-preprocessing)
4. [Exploratory data analysis (EDA)](#4-exploratory-data-analysis-eda)
5. [Feature engineering and selection](#5-feature-engineering-and-selection)
6. [Model training and evaluation](#6-model-training-and-evaluation)
7. [Model deployment](#7-model-deployment)
8. [Real-time streaming: built, but not hosted](#8-real-time-streaming-built-but-not-hosted)
9. [Tech stack](#tech-stack)
10. [Project structure](#project-structure)
11. [How to run it](#how-to-run-it)
12. [Limitations](#limitations)

---

## 1. Business need and problem statement

### Why businesses need this

- **Fraud is expensive and fast.** In mobile money, a stolen balance can be moved and cashed out within minutes. Catching it afterwards rarely gets the money back.
- **Checking by hand does not scale.** People cannot review millions of transactions, so a system has to filter them and send only the suspicious ones to analysts.
- **Wrong decisions cost money both ways.** Missing a fraud loses money directly. Blocking a genuine customer loses trust and business.

### Problem statement

> Given the details of a transaction **known before it completes**, predict how likely it is to be fraud, and turn that probability into one of three actions (approve, review or block) fast enough to act before the money moves.

### Questions asked before building anything

| Question | Answer used in this project |
|---|---|
| What exactly are we predicting? | Whether a transaction is fraud (1) or genuine (0). |
| When must the decision be made? | Before the transaction completes, in real time. |
| So which information may the model use? | Only what is known **before** the transaction finishes. Balances *after* the transaction are off limits (see the lesson in [section 5](#5-feature-engineering-and-selection)). |
| How rare is fraud? | Very rare: about 0.13% of all transactions. This shapes every other choice. |
| What does a mistake cost? | A missed fraud (false negative) loses money. A false alarm (false positive) annoys a customer and costs analyst time. |
| Is "block or approve" enough? | No. A middle "review" option lets uncertain cases go to a person instead of forcing a guess. |
| How should the model be tested? | On **later** transactions than it trained on, like real life, not on a random mix. |
| How fast must it be? | Fast enough for real time. Scoring takes about 8 ms. |
| Can people understand the output? | Yes: a probability, a decision, and a clear web page. |

### Which metrics matter, and why

Only about 1 in 770 transactions is fraud. A model that approves **everything** would be more than 99.8% "accurate" and catch no fraud at all. So **accuracy is not used.**

| Metric | What it tells you | Why it matters here |
|---|---|---|
| **PR-AUC** (main metric) | How well the model ranks fraud above genuine transactions, across all thresholds | Built for rare-event problems. 1.0 is perfect. |
| **Recall** | Of all real frauds, how many we caught | A missed fraud is lost money. |
| **Precision** | Of everything we flagged, how much was really fraud | Low precision means many angry customers and a flooded review team. |
| **F1** | One number balancing precision and recall | A quick summary at a single threshold. |

The decision thresholds (when to review, when to block) are a **business choice** that trades recall against precision. They are discussed in [section 6](#6-model-training-and-evaluation).

---

## 2. Gathering the data

- **Dataset:** [PaySim](https://www.kaggle.com/datasets/ealaxi/paysim1) on Kaggle. It is a public simulation of mobile-money transactions, built from the logs of a real service, so no real customer data is exposed.
- **Size:** 6,362,620 transactions covering 743 hourly steps (about 30 days). 8,213 are fraud (0.129%).
- **Where it goes:** download it and save it as `data/raw/credit_card.csv`. (The file name is historical. Despite the name, it is the PaySim file, and the code expects this path.) The raw file is large and is not stored in the repository.

| Column | Meaning |
|---|---|
| `step` | Hour of the simulation (1 to 743) |
| `type` | PAYMENT, CASH_IN, DEBIT, CASH_OUT or TRANSFER |
| `amount` | Transaction amount |
| `nameOrig` / `nameDest` | Sender and receiver account IDs |
| `oldbalanceOrg` / `newbalanceOrig` | Sender balance before / after |
| `oldbalanceDest` / `newbalanceDest` | Receiver balance before / after |
| `isFraud` | **The answer we want to predict** (1 = fraud) |
| `isFlaggedFraud` | A simple built-in rule flag from the dataset |

A small ready-made test file is in `data/sample/test_transactions.csv`.

---

## 3. Data preprocessing

Done in `notebooks/02_feature_engineering.ipynb`.

1. **Keep only `TRANSFER` and `CASH_OUT`.** All fraud in the data is in these two types. The other three have none. This leaves 2,770,409 rows with 0.30% fraud, a better ratio to learn from. In the live system, other types are approved automatically.
2. **Drop columns that do not help:**
   - `nameOrig` is almost always unique (6.35M different values in 6.36M rows), so it tells the model nothing.
   - `nameDest` was also dropped to keep the model about *behaviour*, not about specific accounts.
   - `isFlaggedFraud` caught only 16 of 8,213 frauds, so it is nearly useless.
3. **Split by time, not at random.** The first 80% of hours are used for training and the last 20% for testing. A random split would let the model "peek" at the future. A time split matches how the model is used in real life.

| | Rows | Fraud rate |
|---|---|---|
| Training | 2,217,905 | 0.18% |
| Test | 552,504 | 0.77% |

The test period has a *higher* fraud rate than training. This is a real distribution shift, which makes the test harder and more honest.

4. **Save as Parquet** into `data/processed/` for fast loading.

There were no missing values and no duplicates to fix.

---

## 4. Exploratory data analysis (EDA)

Done in `notebooks/01_eda_notebooks.ipynb`. What we found:

| Finding | Why it matters |
|---|---|
| Fraud is only **0.13%** of all rows | Needs special handling and the right metrics. |
| Fraud exists **only** in TRANSFER (4,097) and CASH_OUT (4,116) | We can restrict the model to these types. |
| Fraud amounts are much larger (median about 441k vs about 75k for genuine) and are capped at 10 million | Amount is a useful signal. |
| In 98% of fraud, the sender's balance ends at **0** | Fraudsters empty the account. (57% of genuine transactions also end at 0, so this alone is not enough.) |
| Fraud receivers usually start with a **zero** balance | Money is moved into fresh or empty accounts. |
| Account IDs are almost all unique | Not useful as features. |
| The built-in `isFlaggedFraud` rule misses almost everything | A learned model is needed. |

---

## 5. Feature engineering and selection

Done in `notebooks/02_feature_engineering.ipynb` and `src/features.py`.

A *feature* is a clue we hand to the model. Raw balances are not enough, so we turned the EDA findings into clues:

| Feature | In plain words |
|---|---|
| `amount` | How much money moves |
| `oldbalanceOrg` | Sender's balance before |
| `oldbalanceDest` | Receiver's balance before |
| `type_TRANSFER` | Transfer (1) or cash-out (0) |
| `hourOfDay` | Hour of the day (`step % 24`) |
| `destWasEmpty` | Was the receiving account empty before? |
| `drainsAccount` | Does this transaction take the sender's **whole** balance? |
| `amountToBalance` | What share of the sender's balance is being moved? |

### A lesson learned: data leakage

My first version also used balances **after** the transaction (`newbalanceOrig`, `newbalanceDest`) and "balance mismatch" features built from them. The model looked perfect (PR-AUC about 1.0), which was suspicious.

Checking feature importance showed that two after-the-transaction columns carried about 95% of the model's decision. In a live system **those values do not exist yet**, because the decision is made before the transaction finishes.

So they were removed, and the features above use only information available at decision time. The score dropped to an honest level, then recovered through better features (`drainsAccount` and `amountToBalance` lifted PR-AUC from 0.936 to 0.989). This is the version used in production.

---

## 6. Model training and evaluation

Done in `notebooks/03_model_trainning.ipynb`.

### Algorithms tried

- **Logistic regression** (baseline): a simple model that sets the bar to beat.
- **XGBoost**: a gradient-boosted tree model that handles non-linear patterns well and is fast at scoring time.

### Handling the imbalance

Three approaches were compared on the same split, with XGBoost:

1. **Nothing** (plain training)
2. **Class weights** (count a fraud mistake as more serious)
3. **SMOTE**

**What is SMOTE?** SMOTE creates *synthetic* fraud examples by blending real ones, so the model sees more fraud to learn from. It is applied to the **training data only**, never to the test data, because a test set must stay real. In this project, fraud was raised to 10% of the genuine count (`sampling_strategy=0.1`) instead of a full 50/50 balance, to avoid flooding training with fake fraud.

SMOTE is a *training-time* technique. It is not run when scoring, so the deployed model already includes its benefit.

### Results (all on the later, unseen test period)

| Model | Features | PR-AUC |
|---|---|---|
| Logistic regression | all, including after-transaction | 0.885 |
| XGBoost (several variants) | all, including after-transaction | about 1.0 (**not usable in real life**, see leakage) |
| Logistic regression | before-transaction only | 0.749 |
| XGBoost, first attempt | before-transaction only (5 features) | 0.936 |
| XGBoost, improved features | before-transaction only | 0.989 |
| **XGBoost + SMOTE (selected)** | before-transaction only | **0.9998** |

At a 0.5 threshold, the selected model reached **precision 0.9986 and recall 0.9993**.

### Model selection

XGBoost with SMOTE scored highest in the comparison and was selected. Only the "before-transaction" rows are fair comparisons, since those are what a live system can actually use.

### Parameter tuning

No systematic search (grid or random) was run. XGBoost used reasonable fixed settings: 300 trees, depth 6, learning rate 0.1, histogram tree method, seed 42. Tuning these and the SMOTE ratio is listed under [what I would do next](#what-i-would-do-next).

### Choosing the decision thresholds

The model outputs a fraud probability. Two thresholds turn it into an action:

| Probability | Action |
|---|---|
| below 10% | **Approve** |
| 10% to 90% | **Review** (send to a person) |
| 90% or more | **Block** |

How the choice affects results on the test period (4,258 real frauds):

| Threshold | Precision | Recall | Transactions flagged |
|---|---|---|---|
| 0.1 | 0.986 | 0.9998 | 4,316 |
| 0.3 | 0.995 | 0.9998 | 4,277 |
| 0.5 | 0.9986 | 0.9993 | 4,261 |
| 0.7 | 0.9988 | 0.9988 | 4,258 |
| 0.9 | 1.000 | 0.998 | 4,250 |
| 0.95 | 1.000 | 0.998 | 4,248 |

A lower threshold catches more fraud but raises false alarms. A higher one is stricter but misses more. **The 10% and 90% values are illustrative.** They were read from the test results, and in a real business they would come from the actual cost of a missed fraud versus a false alarm. A validation slice from the training data was tried too, but it was too easy (recall was 1.0 at almost every threshold) and could not guide the choice.

---

## 7. Model deployment

The model is served by a **FastAPI** backend, and a **React** web app sits on top of it.

```
 Web app (React)  ──HTTP──▶  FastAPI  ──▶  XGBoost model (models/fraud_xgb.json)
                                ▲
 Kafka consumer  ───────────────┘   (local streaming demo, see section 8)
```

### What was exported

- `models/fraud_xgb.json`: the trained model in XGBoost's portable format.
- `models/config.json`: the feature list, the two thresholds and the XGBoost version.

### API endpoints

| Endpoint | What it does |
|---|---|
| `GET /health` | Confirms the service is running |
| `POST /predict` | Scores one transaction |
| `POST /predict/batch` | Scores an uploaded CSV or Parquet file (up to 50 MB and 200,000 rows) and returns a summary plus the top flagged transactions |

Example:

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"step":1,"type":"TRANSFER","amount":181,"oldbalanceOrg":181,"oldbalanceDest":0}'
```

```json
{ "fraud_probability": 0.999984, "decision": "block", "latency_ms": 8.51 }
```

Transaction types other than TRANSFER and CASH_OUT are approved automatically with probability 0, because the training data has no fraud in them.

### The web app (`frontend/`)

- A **live check card**: pick an example or enter a transaction, and see the decision and a probability meter with the 10% and 90% lines marked.
- A **file analyser**: drop a CSV or Parquet file, see a summary bar, key numbers, the flagged transactions, and download them. If the file has an `isFraud` column, results are checked against it.
- Sections explaining how it works, the results, the limits, and a sample file.
- **Easy re-theming:** add `?color=ea580c` (any hex colour, no `#`), `?theme=teal`, or `?for=CompanyName` to the link to recolour the site and show a "Prepared for ..." badge.

### Deploying it

- Backend: a Python host such as Render or Railway. Set the environment variable `ALLOWED_ORIGINS` to the frontend's URL.
- Frontend: a static host such as Vercel or Netlify. Set `VITE_API_URL` to the backend's URL.

---

## 8. Real-time streaming: built, but not hosted

I built a full **real-time pipeline** with Kafka. It works end to end on a local machine:

```
Producer ──▶ Kafka topic "transactions" ──▶ Consumer ──▶ POST /predict ──▶ approve / review / block
(replays later transactions)                 (calls the model API for each transaction)
```

- The **producer** replays transactions from the test period at a chosen speed.
- The **consumer** reads each transaction from Kafka, calls the scoring API, and prints the decision, the actual label, and the latency. End-to-end time is typically 8 to 20 ms per scored transaction on a laptop.
- Kafka runs in Docker (`docker-compose.yml`).

**Why it is not part of the hosted demo:** Kafka needs a server that runs *all the time*, plus a consumer that listens continuously. Free hosting tiers cannot run that, and there is no free managed Kafka. Paying for hosting did not fit a portfolio project. So the hosted site scores through the same API directly (one transaction or a whole file), while the complete streaming code in `streaming/` is available and runs locally. SMOTE is unaffected, as it only matters during training.

---

## Tech stack

| Area | Tools |
|---|---|
| Language | Python, JavaScript |
| Data and analysis | pandas, NumPy, PyArrow (Parquet), Jupyter, matplotlib |
| Machine learning | scikit-learn, XGBoost, imbalanced-learn (SMOTE) |
| Backend / API | FastAPI, Uvicorn, Pydantic |
| Streaming | Apache Kafka, Docker, kafka-python |
| Frontend | React, Vite, plain CSS |

---

## Project structure

```
.
├── api/
│   └── app.py                  # FastAPI service (/health, /predict, /predict/batch)
├── src/
│   ├── features.py             # builds model features (used by training and serving)
│   ├── predict.py              # loads the model, scores, applies thresholds
│   ├── preprocessing.py        # placeholder: planned scripted version of notebook 02
│   └── train.py                # placeholder: planned scripted version of notebook 03
├── notebooks/
│   ├── 01_eda_notebooks.ipynb          # exploratory data analysis
│   ├── 02_feature_engineering.ipynb    # preprocessing, features, time split
│   └── 03_model_trainning.ipynb        # models, SMOTE, evaluation, export
├── models/
│   ├── fraud_xgb.json          # trained model
│   └── config.json             # features, thresholds, XGBoost version
├── data/
│   ├── raw/                    # put the PaySim CSV here (not in git)
│   ├── processed/              # Parquet train/test splits (created by notebook 02)
│   └── sample/test_transactions.csv
├── streaming/
│   ├── producer.py             # replays transactions into Kafka
│   └── consumer.py             # reads from Kafka, calls the API
├── docker-compose.yml          # local Kafka
└── frontend/                   # React web app (Vite)
```

---

## How to run it

**You need:** Python 3.10 or newer, Node.js 20 or newer, and Docker (only for the streaming demo).

### 1. Get the code and set up Python

```bash
git clone https://github.com/Bishesh-P/Real-Time-Fraud-detection-pipeline.git
cd Real-Time-Fraud-detection-pipeline

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install pandas numpy pyarrow scikit-learn xgboost imbalanced-learn \
            fastapi uvicorn python-multipart kafka-python requests jupyter matplotlib
```

### 2. Add the data

Download PaySim from Kaggle and save it as `data/raw/credit_card.csv`.

### 3. Build the model (skip if `models/` already holds the model)

Open Jupyter and run the notebooks **in order**, each from top to bottom:

```bash
jupyter notebook
```

1. `01_eda_notebooks.ipynb` (exploration only)
2. `02_feature_engineering.ipynb` (creates `data/processed/`)
3. `03_model_trainning.ipynb` (trains the models and exports `models/fraud_xgb.json` and `models/config.json`)

### 4. Start the API

From the project root:

```bash
uvicorn api.app:app --reload
```

Open http://127.0.0.1:8000/docs to try the API in your browser.

### 5. Start the web app

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. If the API runs somewhere else, create `frontend/.env` containing `VITE_API_URL=http://your-api-address`.

### 6. (Optional) Run the real-time Kafka demo

Keep the API running, then use three more terminals from the project root, each with the virtual environment active:

```bash
docker compose up -d                                      # start Kafka
python streaming/consumer.py                              # listens and scores
python streaming/producer.py --rate 20 --limit 2000       # sends 2,000 transactions at 20 per second
```

Watch the consumer print one line per transaction, for example `TRANSFER amount=... p=0.9999 -> block actual=1`. Stop the consumer with `Ctrl+C` and Kafka with `docker compose down`.

---

## Limitations

- **Simulated data.** PaySim's fraud follows a fixed pattern (empty the account, move the money, cash out). Real fraud is far more varied and much harder to separate, so these scores will not carry over to real data.
- **One dataset only.** The model is built for PaySim and is not a general fraud detector.
- **Only two transaction types are scored.** Everything else is approved by rule.
- **Illustrative thresholds.** The 10% and 90% cut-offs were not tuned against real business costs.
- **Distribution shift.** Fraud is more common in the test period (0.77%) than in training (0.18%). Real systems need monitoring for this kind of drift.
- **No hyperparameter search.** Model settings were fixed, not tuned.
- **Not hosted: Kafka.** The streaming pipeline runs locally only.

---

## Author

Built by **Bishesh Pokharel**, a computer engineering graduate focused on data engineering and AI/ML.
