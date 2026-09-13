import { duplicateKey } from "@/lib/crm";

export type DuplicateMatch = { confidence: "high" | "low"; key: string };

function normName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function domainOf(website?: string | null): string {
  return (website || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
}

export function duplicateMatch(
  a: { name: string; website?: string | null },
  b: { name: string; website?: string | null },
): DuplicateMatch | null {
  const da = domainOf(a.website);
  const db = domainOf(b.website);
  if (da && db && da === db) return { confidence: "high", key: da };
  const na = normName(a.name);
  const nb = normName(b.name);
  if (na && na === nb) return { confidence: da || db ? "high" : "low", key: duplicateKey(a.name, a.website) };
  if (na && nb && (na.includes(nb) || nb.includes(na)) && Math.min(na.length, nb.length) >= 6) {
    return { confidence: "low", key: duplicateKey(a.name, a.website) };
  }
  return null;
}
