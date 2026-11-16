export const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// must match models/config.json
export const THRESHOLDS = { review: 0.1, block: 0.9 };
export const SCORED_TYPES = ["TRANSFER", "CASH_OUT"];

export function errorText(data, fallback) {
  const d = data?.detail;
  if (!d) return fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d))
    return d.map((e) => `${(e.loc || []).slice(1).join(".")}: ${e.msg}`).join("; ");
  return fallback;
}

export function formatProb(p) {
  if (p < 0.0001) return "under 0.01%";
  return `${(p * 100).toFixed(2)}%`;
}