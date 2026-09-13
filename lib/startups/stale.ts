import type { ScoredDeal } from "@/types";

export function analysisIsStale(deal: ScoredDeal): boolean {
  const scored = deal.score?.scoredAt;
  const updated = deal.dateUpdated;
  if (!scored || !updated) return false;
  const s = new Date(scored).getTime();
  const u = new Date(updated).getTime();
  return Number.isFinite(s) && Number.isFinite(u) && u > s + 60_000;
}

export function analysisStaleLabel(deal: ScoredDeal): string | null {
  if (!analysisIsStale(deal) || !deal.score?.scoredAt) return null;
  const scored = new Date(deal.score.scoredAt);
  if (!Number.isFinite(scored.getTime())) return null;
  const date = scored.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `AI analysis from ${date} — startup information has changed.`;
}
