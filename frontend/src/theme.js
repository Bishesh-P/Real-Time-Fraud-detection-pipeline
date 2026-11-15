const PRESETS = {
  indigo: "#4f46e5",
  teal: "#0d9488",
  blue: "#2563eb",
  orange: "#ea580c",
  green: "#16a34a",
  rose: "#e11d48",
  slate: "#334155",
};

const DEFAULT = import.meta.env.VITE_BRAND_COLOR || PRESETS.indigo;

function normalize(c) {
  if (!c) return null;
  const h = c.startsWith("#") ? c : `#${c}`;
  return /^#[0-9a-f]{6}$/i.test(h) ? h : null;
}

// white or dark text, whichever is readable on the brand colour
function readable(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111827" : "#ffffff";
}

export function applyTheme() {
  const q = new URLSearchParams(window.location.search);
  const color =
    normalize(q.get("color")) || PRESETS[q.get("theme")] || normalize(DEFAULT) || PRESETS.indigo;
  const style = document.documentElement.style;
  style.setProperty("--brand", color);
  style.setProperty("--on-brand", readable(color));
  const company = (q.get("for") || "").slice(0, 40);
  return { company };
}