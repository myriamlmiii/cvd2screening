import { createHash } from "crypto";
import { parseFunding } from "@/lib/funding";

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(sas|sarl|ltd|llc|inc|gmbh|sa|plc|corp|co)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeDomain(website?: string | null): string | null {
  if (!website) return null;
  try {
    const raw = website.trim().replace(/^\[+|\]+$/g, "");
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProto);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === "localhost") return null;
    return host;
  } catch {
    const host = website
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/[/?#].*$/, "")
      .replace(/[^a-z0-9.-]/g, "");
    return host || null;
  }
}

export function normalizeUrl(website?: string | null): string | null {
  const host = normalizeDomain(website);
  if (!host) return null;
  return `https://${host}`;
}

export function contentHash(parts: Array<string | null | undefined>): string {
  return createHash("sha256")
    .update(parts.map((p) => (p || "").trim().toLowerCase().replace(/\s+/g, " ")).join("|"))
    .digest("hex")
    .slice(0, 16);
}

export function normalizeFunding(raw: string | null): { amount: number | null; currency: string | null; clean: string | null } {
  const parsed = parseFunding(raw);
  if (!parsed) return { amount: null, currency: null, clean: null };
  return { amount: parsed.amount, currency: parsed.currency, clean: parsed.clean || raw };
}
