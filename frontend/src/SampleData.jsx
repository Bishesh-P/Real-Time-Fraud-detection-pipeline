import { useState } from "react";
import { SAMPLE_URL, SAMPLE_NAME, GENERATOR_CODE } from "./sample";

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
        <button type="button" className="secondary small" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

export default function SampleData() {
  return (
    <section className="card stack">
      <h2>Sample data</h2>
      <p>
        A ready-made test file for trying the app. Download it and upload it in the{" "}
        <b>Analyse a file</b> tab, or use the "Use sample file" button there.
      </p>
      <p>
        <a className="btn" href={SAMPLE_URL} download={SAMPLE_NAME}>Download {SAMPLE_NAME}</a>
      </p>

      <h3>Columns</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Column</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td>step</td><td>Hour of the simulation (1 to 743)</td></tr>
            <tr><td>type</td><td>PAYMENT, CASH_IN, DEBIT, CASH_OUT or TRANSFER</td></tr>
            <tr><td>amount</td><td>Transaction amount</td></tr>
            <tr><td>oldbalanceOrg</td><td>Sender balance before the transaction</td></tr>
            <tr><td>oldbalanceDest</td><td>Receiver balance before the transaction</td></tr>
            <tr><td>isFraud <em>(optional)</em></td><td>1 = fraud. Only used to score the results, never as a model input</td></tr>
          </tbody>
        </table>
      </div>
      <p className="hint">
        This file is for trying the app. The accuracy figures on the About page come from
        held-out PaySim data, not from this file.
      </p>

      {GENERATOR_CODE && (
        <>
          <h3>How it was generated</h3>
          <CodeBlock title="generate_sample.py" code={GENERATOR_CODE} />
        </>
      )}
    </section>
  );
}