import QuickCheck from "./QuickCheck";
import FileAnalyzer from "./FileAnalyzer";
import Marquee from "./Marquee";
import { HowItWorks, Results, Limits, SampleData } from "./Sections";
import { applyTheme } from "./theme";

const { company } = applyTheme();
const REPO = "https://github.com/Bishesh-P/Real-Time-Fraud-detection-pipeline";

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" style={{ fill: "var(--brand)" }} />
      <path
        d="M5 15h5l3-7 4 12 3-5h3"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: "var(--on-brand)" }}
      />
    </svg>
  );
}

const FACTS = [
  ["0.9998", "PR-AUC on later hours the model never saw"],
  ["About 8 ms", "to score one transaction"],
  ["3 outcomes", "approve, review or block"],
  ["6.36M", "simulated transactions in the dataset"],
];

export default function App() {
  return (
    <>
      <header className="nav">
        <div className="wrap">
          <a className="brand" href="#top"><Logo />Fraud Checker</a>
          <nav className="nav-links" aria-label="Main">
            <a className="hide-sm" href="#file">Analyse a file</a>
            <a className="hide-sm" href="#how">How it works</a>
            <a className="hide-sm" href="#results">Results</a>
            <a className="hide-sm" href="#limits">Limits</a>
            <a className="hide-sm" href={REPO} target="_blank" rel="noreferrer">GitHub</a>
            <a className="btn btn-sm" href="#check">Try it</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero" id="check">
          <div className="wrap hero-grid">
            <div>
              {company && <span className="pill">Prepared for {company}</span>}
              <h1>Catch fraud before the money moves.</h1>
              <p className="lede">
                Score a transaction in milliseconds, or upload a file and see which transactions to
                block, review or approve.
              </p>
              <div className="hero-actions">
                <a className="btn" href="#file">Analyse a file</a>
                <a className="btn btn-ghost" href="#how">How it works</a>
              </div>
              <p className="fine">
                Trained on simulated PaySim data. A portfolio demo, not for real financial decisions.
              </p>
            </div>
            <QuickCheck />
          </div>
        </section>

        <section className="facts" aria-label="Key facts">
          <div className="wrap">
            <div className="facts-card">
              {FACTS.map(([big, label]) => (
                <div className="fact" key={label}>
                  <b>{big}</b>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Marquee />

        <section className="section" id="file">
          <div className="wrap">
            <div className="section-head">
              <h2>Analyse a whole file</h2>
              <p>
                Upload transactions as CSV or Parquet. You get a summary, the flagged transactions,
                and a download.
              </p>
            </div>
            <FileAnalyzer />
          </div>
        </section>

        <HowItWorks />
        <Results />
        <Limits />
        <SampleData />

        <section className="cta">
          <div className="wrap">
            <div className="cta-card">
              <div>
                <h2>See it score a transaction.</h2>
                <p>Run an example in the demo card, or upload your own file.</p>
              </div>
              <div className="cta-actions">
                <a className="btn" href="#check">Check a transaction</a>
                <a className="btn btn-ghost" href={REPO} target="_blank" rel="noreferrer">View the code</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <span>Built by Bishesh Pokharel with XGBoost, FastAPI and React.</span>
          <a href={REPO} target="_blank" rel="noreferrer">Source code on GitHub</a>
        </div>
      </footer>
    </>
  );
}