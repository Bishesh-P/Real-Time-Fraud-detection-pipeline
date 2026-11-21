import { useEffect, useState } from "react";
import { API, THRESHOLDS, SCORED_TYPES, errorText, formatProb } from "./api";

const TYPES = ["TRANSFER", "CASH_OUT", "PAYMENT", "CASH_IN", "DEBIT"];

const PRESETS = [
  { label: "Cash-out, healthy account", values: { type: "CASH_OUT", step: 1, amount: 5000, oldbalanceOrg: 200000, oldbalanceDest: 150000 } },
  { label: "Transfer that empties the account", values: { type: "TRANSFER", step: 1, amount: 181, oldbalanceOrg: 181, oldbalanceDest: 0 } },
  { label: "Payment", values: { type: "PAYMENT", step: 9, amount: 1200, oldbalanceOrg: 30000, oldbalanceDest: 0 } },
];

const COPY = {
  block: { head: "Block", text: "Likely fraud. Stop this transaction." },
  review: { head: "Review", text: "Suspicious. Send it to an analyst." },
  approve: { head: "Approve", text: "Looks legitimate." },
};

export default function QuickCheck() {
  const [form, setForm] = useState(PRESETS[1].values);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("checking");

useEffect(() => {
  const ctrl = new AbortController();
  fetch(`${API}/health`, { signal: ctrl.signal })
    .then((r) => setStatus(r.ok ? "online" : "offline"))
    .catch((e) => { if (e.name !== "AbortError") setStatus("offline"); });
  return () => ctrl.abort();
}, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function run(values) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: Number(values.step),
          type: values.type,
          amount: Number(values.amount),
          oldbalanceOrg: Number(values.oldbalanceOrg),
          oldbalanceDest: Number(values.oldbalanceDest),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorText(data, "The request failed."));
      setResult({ ...data, type: values.type });
    } catch (err) {
      setResult(null);
      setError(
        err instanceof TypeError
          ? "Can't reach the scoring server. Check that the API is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  function usePreset(values) {
    setForm(values);
    run(values);
  }

  function submit(e) {
    e.preventDefault();
    run(form);
  }

  const copy = result ? COPY[result.decision] : null;
  const p = result ? result.fraud_probability : 0;
  const scored = result ? SCORED_TYPES.includes(result.type) : true;

  return (
    <div className="tool">
      <div className="tool-head">
  <h2>Check a transaction</h2>
  <span className={`status ${status}`}>
    {status === "online" ? "Scoring server online" : status === "offline" ? "Server offline" : "Connecting..."}
  </span>
</div>
      <p className="sub">Pick an example or enter your own values.</p>

      <div className="chips">
        {PRESETS.map((x) => (
          <button key={x.label} type="button" className="chip" onClick={() => usePreset(x.values)}>
            {x.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="fields">
        <label className="field">
          Type
          <select value={form.type} onChange={set("type")}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">
          Hour of simulation
          <input type="number" min="1" required value={form.step} onChange={set("step")} />
        </label>
        <label className="field full">
          Amount
          <input type="number" min="0" step="any" required value={form.amount} onChange={set("amount")} />
        </label>
        <label className="field">
          Sender balance before
          <input type="number" min="0" step="any" required value={form.oldbalanceOrg} onChange={set("oldbalanceOrg")} />
        </label>
        <label className="field">
          Receiver balance before
          <input type="number" min="0" step="any" required value={form.oldbalanceDest} onChange={set("oldbalanceDest")} />
        </label>
        <button type="submit" className="btn full" disabled={loading}>
          {loading ? "Scoring..." : "Check transaction"}
        </button>
      </form>

      <div aria-live="polite">
        {error && <p className="error">{error}</p>}
        {result && (
          <div className={`result tone-${result.decision}`}>
            <div className="verdict-row">
              <span className="verdict-head">{copy.head}</span>
              <span className="prob">Fraud probability <b>{formatProb(p)}</b></span>
            </div>
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${Math.max(p * 100, 1.5)}%` }} />
              <span className="tick" style={{ left: `${THRESHOLDS.review * 100}%` }} />
              <span className="tick" style={{ left: `${THRESHOLDS.block * 100}%` }} />
            </div>
            <p className="meter-note">
              Review above {THRESHOLDS.review * 100}%, block above {THRESHOLDS.block * 100}%. Scored in {result.latency_ms} ms.
            </p>
            <p className="verdict-text">{copy.text}</p>
            {!scored && (
              <p className="meter-note">
                {result.type} transactions aren't scored by the model. They are approved by rule,
                because the training data has no fraud in this type.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}