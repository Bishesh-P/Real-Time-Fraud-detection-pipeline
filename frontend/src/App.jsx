import { useState } from "react";
import About from "./About";
import SampleData from "./SampleData";
import { applyTheme } from "./theme";
import { SAMPLE_URL, SAMPLE_NAME } from "./sample";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const TYPES = ["TRANSFER", "CASH_OUT", "PAYMENT", "CASH_IN", "DEBIT"];
const { company } = applyTheme();

const VERDICT = {
  block: { label: "Likely fraud: block", cls: "block" },
  review: { label: "Needs review", cls: "review" },
  approve: { label: "Looks legitimate", cls: "approve" },
};

function errorText(data, fallback) {
  const d = data?.detail;
  if (!d) return fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d))
    return d.map((e) => `${(e.loc || []).slice(1).join(".")}: ${e.msg}`).join("; ");
  return fallback;
}

function SingleCheck() {
  const [form, setForm] = useState({
    step: 1, type: "TRANSFER", amount: 181, oldbalanceOrg: 181, oldbalanceDest: 0,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: Number(form.step),
          type: form.type,
          amount: Number(form.amount),
          oldbalanceOrg: Number(form.oldbalanceOrg),
          oldbalanceDest: Number(form.oldbalanceDest),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorText(data, "Request failed"));
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <form onSubmit={submit} className="grid">
        <label>
          Transaction type
          <select value={form.type} onChange={set("type")}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>
          Time step (hour)
          <input type="number" min="1" required value={form.step} onChange={set("step")} />
        </label>
        <label>
          Amount
          <input type="number" min="0" step="any" required value={form.amount} onChange={set("amount")} />
        </label>
        <label>
          Sender balance before
          <input type="number" min="0" step="any" required value={form.oldbalanceOrg} onChange={set("oldbalanceOrg")} />
        </label>
        <label>
          Receiver balance before
          <input type="number" min="0" step="any" required value={form.oldbalanceDest} onChange={set("oldbalanceDest")} />
        </label>
        <button type="submit" disabled={loading}>{loading ? "Checking..." : "Check transaction"}</button>
      </form>

      {error && <p className="error">{error}</p>}
      {result && (
        <div className={`verdict ${VERDICT[result.decision].cls}`}>
          <strong>{VERDICT[result.decision].label}</strong>
          <span>Fraud probability: {(result.fraud_probability * 100).toFixed(2)}%</span>
          <small>Scored in {result.latency_ms} ms</small>
        </div>
      )}
      <p className="hint">
        Try: TRANSFER, amount 181, sender balance 181, receiver balance 0 (looks like fraud).
      </p>
    </section>
  );
}

function downloadCsv(rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const lines = rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","));
  const csv = [cols.join(","), ...lines].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "flagged_transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, cls }) {
  return (
    <div className={`stat ${cls || ""}`}>
      <span>{label}</span>
      <strong>{Number(value).toLocaleString()}</strong>
    </div>
  );
}

function FileCheck() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function useSample() {
    setError("");
    try {
      const res = await fetch(SAMPLE_URL);
      if (!res.ok) throw new Error("Sample file not found");
      const blob = await res.blob();
      setFile(new File([blob], SAMPLE_NAME, { type: "text/csv" }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API}/predict/batch`, { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(errorText(json, "Upload failed"));
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const s = data?.summary;
  const cols = data?.flagged?.length ? Object.keys(data.flagged[0]) : [];

  return (
    <section className="card">
      <p>
        Upload a CSV or Parquet file with columns:{" "}
        <code>step, type, amount, oldbalanceOrg, oldbalanceDest</code>. If it also has an{" "}
        <code>isFraud</code> column, the results are checked against it.
      </p>
      <form onSubmit={submit} className="upload">
        <input type="file" accept=".csv,.parquet" onChange={(e) => setFile(e.target.files[0])} />
        <button type="button" className="secondary" onClick={useSample}>Use sample file</button>
        <button type="submit" disabled={!file || loading}>{loading ? "Analysing..." : "Analyse file"}</button>
        {file && <span className="hint">Selected: {file.name}</span>}
      </form>

      {error && <p className="error">{error}</p>}

      {s && (
        <>
          {data.truncated && <p className="hint">Large file: only the first rows were analysed.</p>}
          <div className="stats">
            <Stat label="Transactions" value={s.rows} />
            <Stat label="Blocked" value={s.block} cls="block" />
            <Stat label="Review" value={s.review} cls="review" />
            <Stat label="Approved" value={s.approve} cls="approve" />
          </div>

          {s.actual_fraud !== undefined && (
            <div className="stats">
              <Stat label="Actual fraud in file" value={s.actual_fraud} />
              <Stat label="Fraud caught" value={s.fraud_caught} cls="approve" />
              <Stat label="False alarms" value={s.false_alarms} cls="review" />
            </div>
          )}

          <div className="row">
            <h3>Flagged transactions (top {data.flagged.length})</h3>
            {data.flagged.length > 0 && (
              <button className="secondary" onClick={() => downloadCsv(data.flagged)}>Download CSV</button>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {data.flagged.slice(0, 100).map((r, i) => (
                  <tr key={i}>{cols.map((c) => <td key={c}>{String(r[c])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.flagged.length > 100 && (
            <p className="hint">Showing the first 100 here. Download the CSV for all of them.</p>
          )}
        </>
      )}
    </section>
  );
}

const TABS = [
  ["about", "About"],
  ["single", "Check one transaction"],
  ["file", "Analyse a file"],
  ["sample", "Sample data"],
];

export default function App() {
  const [tab, setTab] = useState("about");
  return (
    <>
      <header className="hero">
        <div className="wrap">
          {company && <span className="badge">Prepared for {company}</span>}
          <h1>Transaction Fraud Checker</h1>
          <p>Machine-learning fraud detection: approve, review or block a transaction in milliseconds.</p>
        </div>
      </header>

      <main className="wrap">
        <nav className="tabs">
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>

        {tab === "about" && <About go={setTab} />}
        {tab === "single" && <SingleCheck />}
        {tab === "file" && <FileCheck />}
        {tab === "sample" && <SampleData />}
      </main>

      <footer>
        Built by Bishesh Pokharel · XGBoost + FastAPI + React · trained on simulated PaySim data
      </footer>
    </>
  );
}