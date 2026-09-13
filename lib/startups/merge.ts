import type { ScoredDeal } from "@/types";

function key(deal: ScoredDeal): string {
  return (deal.name || "").trim().toLowerCase();
}

/** CRM (Supabase) is operational truth. Snapshot/Airtable fills names not yet in CRM. Drive never replaces the universe. */
export function mergeCrmWithFallback(crm: ScoredDeal[], fallback: ScoredDeal[]): ScoredDeal[] {
  if (!crm.length) return fallback;
  const seen = new Set(crm.map(key).filter(Boolean));
  const extra = fallback.filter((d) => {
    const k = key(d);
    return k && !seen.has(k);
  });
  return extra.length ? [...crm, ...extra] : crm;
}
