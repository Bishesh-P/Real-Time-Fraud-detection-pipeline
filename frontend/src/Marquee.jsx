const ITEMS = [
  "Python", "pandas", "scikit-learn", "XGBoost", "SMOTE",
  "FastAPI", "Apache Kafka", "Docker", "React", "Vite",
];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee">
      <span className="sr-only">Built with {ITEMS.join(", ")}</span>
      <div className="marquee-track" aria-hidden="true">
        {row.map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  );
}