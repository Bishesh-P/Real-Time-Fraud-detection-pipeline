import { useState } from "react";
import { API, errorText } from "./api";
import { SAMPLE_URL, SAMPLE_NAME } from "./sample";

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

export default function FileAnalyzer() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);

  function pick(f) {
    if (!f) return;
    setFile(f);
    setData(null);
    setError("");
  }

  async function useSample() {
    setError("");
    try {
      const res = await fetch(SAMPLE_URL);
      if (!res.ok) throw new Error("The sample file was not found.");
      const blob = await res.blob();
      pick(new File([blob], SAMPLE_NAME, { type: "text/csv" }));
    } catch (err) {
      setError(err.message);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    pick(e.dataTransfer.files?.[0]);
  }

  async function analyse() {
    if (!file) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API}/predict/batch`, { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(errorText(json, "The upload failed."));
      setData(json);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Can't reach the scoring server. Check that the API is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  const s = data?.summary;
  const cols = data?.flagged?.length ? Object.keys(data.flagged[0]) : [];
  const n = (v) => Number(v).toLocaleString();

  return (
    <div className="panel">
      <label
        className={`drop ${drag ? "over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept=".csv,.parquet"
          className="sr-only"
          onChange={(e) => pick(e.target.files[0])}
        />
        <svg className="drop-icon" width="36" height="36" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M12 16V4M7 9l5-5 5 5" />
  <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
</svg>
        <strong>{file ? file.name : "Drop a CSV or Parquet file here"}</strong>
        <span>
          {file ? `${Math.max(1, Math.round(file.size / 1024))} KB, ready to analyse` : "or click to choose one"}
        </span>
      </label>

      <p className="hint">
        Required columns: <code>step</code>, <code>type</code>, <code>amount</code>,{" "}
        <code>oldbalanceOrg</code>, <code>oldbalanceDest</code>. Add <code>isFraud</code> to
        check the results against known labels.
      </p>

      <div className="row-actions">
        <button type="button" className="btn" disabled={!file || loading} onClick={analyse}>
          {loading ? "Analysing..." : "Analyse file"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={useSample}>Use sample file</button>
      </div>

      {error && <p className="error">{error}</p>}

      {s && (
        <div className="results">
          {data.truncated && <p className="hint">Large file: only the first rows were analysed.</p>}

          <div className="stack-bar" role="img"
               aria-label={`${s.block} blocked, ${s.review} for review, ${s.approve} approved`}>
            <span className="seg tone-block" style={{ flexGrow: s.block }} />
            <span className="seg tone-review" style={{ flexGrow: s.review }} />
            <span className="seg tone-approve" style={{ flexGrow: s.approve }} />
          </div>
          <div className="legend">
            <span className="tone-block"><i className="dot" />Block <b>{n(s.block)}</b></span>
            <span className="tone-review"><i className="dot" />Review <b>{n(s.review)}</b></span>
            <span className="tone-approve"><i className="dot" />Approve <b>{n(s.approve)}</b></span>
          </div>

          <div className="tiles">
            <div className="tile"><span>Transactions</span><b>{n(s.rows)}</b></div>
            {s.actual_fraud !== undefined && (
              <>
                <div className="tile"><span>Fraud in file</span><b>{n(s.actual_fraud)}</b></div>
                <div className="tile">
                  <span>Fraud flagged</span>
                  <b>{n(s.fraud_caught)} of {n(s.actual_fraud)}</b>
                </div>
                <div className="tile"><span>False alarms</span><b>{n(s.false_alarms)}</b></div>
              </>
            )}
          </div>

          <div className="table-head">
            <h3>Flagged transactions</h3>
            {data.flagged.length > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => downloadCsv(data.flagged)}>
                Download flagged CSV
              </button>
            )}
          </div>
          {data.flagged.length === 0 ? (
            <p className="hint">Nothing in this file needed a block or review.</p>
          ) : (
            <>
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
                <p className="hint">Showing the first 100. Download the CSV for the full list.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}