import clsx, { type ClassValue } from "clsx";

export const cn = (...v: ClassValue[]) => clsx(v);

export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDate(date: Date | string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(date).toLocaleDateString("en-US", opts);
}

export const compact = (n: number) => Intl.NumberFormat("en-US", { notation: "compact" }).format(n);

/** Accent palette: each feature has its own color. */
export const ACCENTS = {
  purple: { solid: "#8257FF", soft: "#F1ECFF", text: "#5B33E0", grad: "from-[#8257FF] to-[#B49BFF]" },
  blue: { solid: "#4285FF", soft: "#EAF2FF", text: "#1F63E0", grad: "from-[#4285FF] to-[#42C9E8]" },
  coral: { solid: "#FF668C", soft: "#FFEDF2", text: "#E03A64", grad: "from-[#FF668C] to-[#FF984F]" },
  orange: { solid: "#FF984F", soft: "#FFF2E8", text: "#D9651A", grad: "from-[#FF984F] to-[#FFD65A]" },
  green: { solid: "#35C98A", soft: "#E7F8F0", text: "#17935F", grad: "from-[#35C98A] to-[#FFD65A]" },
  yellow: { solid: "#FFD65A", soft: "#FFF8DD", text: "#A87F00", grad: "from-[#FFD65A] to-[#FF984F]" },
  cyan: { solid: "#42C9E8", soft: "#E6F8FC", text: "#118BA8", grad: "from-[#42C9E8] to-[#8257FF]" },
} as const;
export type Accent = keyof typeof ACCENTS;
export const accentOf = (k: string | null | undefined): (typeof ACCENTS)[Accent] =>
  ACCENTS[(k as Accent) in ACCENTS ? (k as Accent) : "purple"];

const ACCENT_KEYS = Object.keys(ACCENTS) as Accent[];
export function hashAccent(seed: string): Accent {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ACCENT_KEYS[Math.abs(h) % ACCENT_KEYS.length];
}

/** GitHub linguist-ish language colors for charts. */
export const LANG_COLORS: Record<string, string> = {
  TypeScript: "#4285FF",
  JavaScript: "#FFD65A",
  Python: "#35C98A",
  Rust: "#FF984F",
  Go: "#42C9E8",
  Java: "#FF668C",
  "C++": "#8257FF",
  C: "#9AA0B4",
  Swift: "#FF7A45",
  Kotlin: "#B49BFF",
  Ruby: "#E0445A",
  HTML: "#FF8A65",
  CSS: "#7C6CF2",
  Shell: "#6BD49B",
  Dart: "#3BB4E5",
  "Jupyter Notebook": "#F59E0B",
};
export const langColor = (l: string) => LANG_COLORS[l] ?? ACCENTS[hashAccent(l)].solid;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
