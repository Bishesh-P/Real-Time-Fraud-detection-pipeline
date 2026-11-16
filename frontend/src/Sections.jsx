import { useState } from "react";
import { SAMPLE_URL, SAMPLE_NAME, GENERATOR_CODE } from "./sample";

const STEPS = [
  ["Collect", "PaySim, a public simulation of mobile-money transactions: 6.36 million rows, 0.13% of them fraud."],
  ["Describe", "Each transaction becomes a few signals known before it completes, such as how much of the sender's balance it takes and whether the receiving account was empty."],
  ["Learn", "XGBoost learns the pattern. SMOTE rebalances the rare fraud examples during training only."],
  ["Serve", "A FastAPI service scores a transaction in about 8 ms."],
  ["Decide", "Under 10% fraud probability the transaction is approved. From 10% to 90% it goes to review. At 90% or more it is blocked."],
];

const RESULTS = [
  ["Logistic regression, baseline", 0.749],
  ["XGBoost", 0.989],
  ["XGBoost with SMOTE (used here)", 0.9998],
];

export function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="wrap">
        <div className="section-head">
          <h2>How a transaction becomes a decision</h2>
          <p>From raw data to an answer in five steps.</p>
        </div>
        <ol className="timeline">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <span className="step-num">{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="hint wide">
          The full project also has a streaming version: a Kafka producer replays transactions and a
          consumer scores each one through this API. It runs locally with Docker and is not part of
          this hosted demo.
        </p>
      </div>
    </section>
  );
}

export function Results() {
  return (
    <section className="section band" id="results">
      <div className="wrap">
        <div className="section-head">
          <h2>How well it ranks fraud</h2>
          <p>
            The model trained on earlier hours of the simulation and was tested on later ones, where
            0.77% of transactions are fraud. PR-AUC measures how well fraud is ranked above legitimate
            transactions. Higher is better, and 1.0 is perfect.
          </p>
        </div>
        <div className="bars">
          {RESULTS.map(([name, v], i) => (
            <div className={`bar-row ${i === RESULTS.length - 1 ? "best" : ""}`} key={name}>
              <span>{name}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${v * 100}%` }} /></div>
              <b>{v}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Limits() {
  return (
    <section className="section" id="limits">
      <div className="wrap">
        <div className="section-head">
          <h2>What this model can and can't do</h2>
          <p>Read this before trusting a score.</p>
        </div>
        <ul className="limits">
          <li>
            <b>It is built for one dataset.</b>
            <span>It was trained on PaySim only. It is not a general fraud detector and should not be used on real bank or card data.</span>
          </li>
          <li>
            <b>The data is simulated.</b>
            <span>PaySim's fraud follows a fixed pattern, so scores this high would not carry over to real-world fraud, which is much harder to separate.</span>
          </li>
          <li>
            <b>Only two transaction types are scored.</b>
            <span>TRANSFER and CASH_OUT are the only types that contain fraud in PaySim. Every other type is approved automatically.</span>
          </li>
          <li>
            <b>Your file needs the right columns.</b>
            <span>step, type, amount, oldbalanceOrg and oldbalanceDest. The sample file below shows the format.</span>
          </li>
          <li>
            <b>This is a portfolio demo.</b>
            <span>Do not use it for real financial decisions.</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

function CodeBlock({ title, code }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the text can still be selected by hand */
    }
  }
  return (
    <div className="code">
      <div className="code-head">
        <span>{title}</span>
        <button type="button" className="btn btn-ghost small" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

export function SampleData() {
  return (
    <section className="section band" id="sample">
      <div className="wrap">
        <div className="section-head">
          <h2>Try it with sample data</h2>
          <p>
            A ready-made test file. Download it, or use the "Use sample file" button in the file
            analyser above. The accuracy figures on this page come from held-out PaySim data, not
            from this file.
          </p>
        </div>
        <p>
          <a className="btn" href={SAMPLE_URL} download={SAMPLE_NAME}>Download {SAMPLE_NAME}</a>
        </p>

        <div className="table-wrap spaced">
          <table>
            <thead><tr><th>Column</th><th>Meaning</th></tr></thead>
            <tbody>
              <tr><td>step</td><td>Hour of the simulation, 1 to 743</td></tr>
              <tr><td>type</td><td>PAYMENT, CASH_IN, DEBIT, CASH_OUT or TRANSFER</td></tr>
              <tr><td>amount</td><td>Transaction amount</td></tr>
              <tr><td>oldbalanceOrg</td><td>Sender balance before the transaction</td></tr>
              <tr><td>oldbalanceDest</td><td>Receiver balance before the transaction</td></tr>
              <tr><td>isFraud (optional)</td><td>1 means fraud. Used only to check results, never as a model input</td></tr>
            </tbody>
          </table>
        </div>

        {GENERATOR_CODE && <CodeBlock title="generate_sample.py" code={GENERATOR_CODE} />}
      </div>
    </section>
  );
}