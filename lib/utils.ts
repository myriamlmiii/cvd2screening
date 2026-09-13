import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------------------------------------------ */
/* Formatting. Institutional shorthand, never raw ISO or long numbers. */
/* ------------------------------------------------------------------ */

/** 1_840_000 -> "€1.84M" */
export function money(value: number, currency: "EUR" | "MAD" = "EUR"): string {
  const sym = currency === "EUR" ? "€" : "";
  const suffix = currency === "MAD" ? " MAD" : "";
  const abs = Math.abs(value);
  let out: string;
  if (abs >= 1_000_000_000) out = `${sym}${(value / 1_000_000_000).toFixed(1)}B`;
  else if (abs >= 1_000_000) out = `${sym}${(value / 1_000_000).toFixed(2)}M`;
  else if (abs >= 1_000) out = `${sym}${(value / 1_000).toFixed(0)}K`;
  else out = `${sym}${value.toFixed(0)}`;
  return out + suffix;
}

/** 0.342 -> "+34.2%" (already-percent numbers: pass ratio=false) */
export function pct(value: number, opts: { ratio?: boolean; sign?: boolean } = {}): string {
  const { ratio = true, sign = false } = opts;
  const n = ratio ? value * 100 : value;
  const s = sign && n > 0 ? "+" : "";
  return `${s}${n.toFixed(1)}%`;
}

export function delta(value: number, opts: { ratio?: boolean; unit?: string } = {}): string {
  const { ratio = true, unit } = opts;
  if (unit) return `${value > 0 ? "+" : ""}${value}${unit}`;
  return pct(value, { ratio, sign: true });
}

/** 8.4 -> "8.4 mo" */
export function months(value: number): string {
  return `${value.toFixed(1)} mo`;
}

export function count(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Date -> "04 SEP 2026" */
export function longDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Date -> "09:42" */
export function clock(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/* ------------------------------------------------------------------ */
/* Score semantics. 85+ positive, 70-84 muted, 50-69 warning, <50 crit */
/* ------------------------------------------------------------------ */

export type ScoreTone = "positive" | "muted" | "warning" | "critical";

export function scoreTone(score: number): ScoreTone {
  if (score >= 85) return "positive";
  if (score >= 70) return "muted";
  if (score >= 50) return "warning";
  return "critical";
}

export function scoreColor(score: number): string {
  const tone = scoreTone(score);
  return {
    positive: "var(--positive)",
    muted: "var(--cvd)",
    warning: "var(--warning)",
    critical: "var(--critical)",
  }[tone];
}

export function trendTone(value: number): "positive" | "critical" | "muted" {
  if (value > 0.001) return "positive";
  if (value < -0.001) return "critical";
  return "muted";
}
