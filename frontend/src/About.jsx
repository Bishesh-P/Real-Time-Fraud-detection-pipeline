const STEPS = [
  ["Data", "PaySim: simulated mobile-money transactions, about 6.3M rows with 0.13% fraud."],
  ["Features", "Only information known before the transaction completes, such as amount versus sender balance and whether the receiver account was empty."],
  ["Model", "XGBoost trained with SMOTE to handle the heavy class imbalance."],
  ["API", "A FastAPI service scores each transaction in about 8 ms."],
  ["Decision", "Block at 90% fraud probability or higher, review between 10% and 90%, approve below 10%."],
];

const RESULTS = [
  ["Logistic regression (baseline)", "0.749"],
  ["XGBoost", "0.989"],
  ["XGBoost + SMOTE (used here)", "0.9998"],
];

const STACK = ["Python", "pandas", "XGBoost", "imbalanced-learn", "FastAPI", "Kafka (local demo)", "React", "Vite"];

export default function About({ go }) {
  return (
    <div className="stack">
      <section className="card stack">
        <h2>What is this project?</h2>
        <p>
          A fraud detection system for mobile-money transactions. You give it the details of
          a transaction, and it returns a fraud probability and a decision: approve, review
          or block. It works on one transaction at a time or on a whole file.
        </p>
        <div className="actions">
          <button onClick={() => go("single")}>Try one transaction</button>
          <button className="secondary" onClick={() => go("file")}>Upload a file</button>
        </div>
      </section>

      <section className="card stack">
        <h2>What happens behind the scenes</h2>
        <div className="steps">
          {STEPS.map(([title, text], i) => (
            <div className="step" key={title}>
              <span className="num">{i + 1}</span>
              <b>{title}</b>
              <p>{text}</p>
            </div>
          ))}
        </div>
        <p className="hint">
          The full project also includes a streaming version: a Kafka producer replays
          transactions, and a consumer scores each one through this API. It runs locally
          with Docker and is not part of this hosted demo.
        </p>
      </section>

      <section className="card stack">
        <h2>Results</h2>
        <p>
          The model was trained on earlier hours of the simulation and tested on later ones
          (0.77% fraud in the test period). PR-AUC measures how well fraud is ranked above
          legitimate transactions, where 1.0 is perfect.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Model (pre-transaction features)</th><th>PR-AUC</th></tr></thead>
            <tbody>
              {RESULTS.map(([m, v]) => <tr key={m}><td>{m}</td><td>{v}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack notice">
        <h2>Please read: limits of this model</h2>
        <ul>
          <li>It was built for the <b>PaySim</b> dataset only. It is not a general fraud detector, and it should not be used on real bank or card data.</li>
          <li>PaySim is simulated, and its fraud follows a fixed pattern. Scores this high would not carry over to real-world fraud, which is far harder to separate.</li>
          <li>Only <b>TRANSFER</b> and <b>CASH_OUT</b> are scored, because those are the only types that contain fraud in PaySim. Other types are approved automatically.</li>
          <li>Your input needs the columns <code>step, type, amount, oldbalanceOrg, oldbalanceDest</code>. The <b>Sample data</b> tab has a ready file to try.</li>
          <li>This is a portfolio demo, not for real financial decisions.</li>
        </ul>
      </section>

      <section className="card stack">
        <h2>Built with</h2>
        <div className="chips">{STACK.map((s) => <span key={s}>{s}</span>)}</div>
        <p>
          <a href="https://github.com/Bishesh-P/Real-Time-Fraud-detection-pipeline" target="_blank" rel="noreferrer">
            View the code on GitHub
          </a>
        </p>
      </section>
    </div>
  );
}