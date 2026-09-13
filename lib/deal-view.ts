import { sourceCategory } from "@/lib/source-category";
import type { AxisKey, PipelineDeal, ScoredDeal, ScoreAxis } from "@/types";

export type WorkflowColumn =
  | "intake"
  | "screening"
  | "reviewing"
  | "shortlisted"
  | "pass";

export const WORKFLOW_COLUMNS: {
  id: WorkflowColumn;
  title: string;
  titleFr: string;
  tint: string;
  header: string;
}[] = [
  { id: "intake", title: "New Intake", titleFr: "Nouvelles", tint: "#3c6660", header: "col-intake" },
  { id: "screening", title: "AI Screening", titleFr: "Screening IA", tint: "#4e3c60", header: "col-screening" },
  { id: "reviewing", title: "Reviewing", titleFr: "En revue", tint: "#3c4866", header: "col-reviewing" },
  { id: "shortlisted", title: "Shortlisted", titleFr: "Shortlist", tint: "#2a4a40", header: "col-shortlisted" },
  { id: "pass", title: "Pass/Watchlist", titleFr: "Pass / Watch", tint: "#5a5448", header: "col-pass" },
];

const AXIS_ORDER: AxisKey[] = ["thesis", "product", "traction", "market", "competition"];

export const AXIS_SHORT: Record<AxisKey, string> = {
  thesis: "Thesis",
  product: "Product",
  traction: "Traction",
  market: "Market",
  competition: "Competition",
};

function filled(v: string | null | undefined): boolean {
  return Boolean(v && v.trim());
}

/** 0–100 dossier coverage from real Airtable fields — used when no AI score exists. */
export function coverageScore(deal: PipelineDeal): number {
  const checks = [
    deal.description,
    deal.pitchUrl,
    deal.sector,
    deal.country,
    deal.fundingSought,
    deal.valuation,
    deal.founder,
    deal.websiteUrl,
    deal.bpUrl || deal.ficheUrl,
    deal.update,
  ];
  return Math.round((checks.filter(filled).length / checks.length) * 100);
}

/** Real AI score only. Never substitute dossier coverage. */
export function displayScore(deal: { score?: { cvdScore?: number | null } | null }): number | null {
  if (deal.score?.cvdScore != null) return Math.round(Number(deal.score.cvdScore));
  return null;
}

export function scoreLabel(deal: { score?: { cvdScore?: number | null } | null }): string {
  const s = displayScore(deal);
  return s == null ? "—" : String(s);
}

export function sortScore(deal: ScoredDeal): number {
  return displayScore(deal) ?? -1;
}

export function radarAxes(deal: ScoredDeal): { axis: string; score: number }[] {
  if (deal.score?.axes?.length) {
    const byKey = new Map(deal.score.axes.map((a) => [a.key, a]));
    return AXIS_ORDER.map((key) => ({
      axis: AXIS_SHORT[key],
      score: byKey.get(key)?.score ?? 0,
    }));
  }
  return AXIS_ORDER.map((key) => ({ axis: AXIS_SHORT[key], score: 0 }));
}

export function toScoreAxes(deal: ScoredDeal): ScoreAxis[] {
  if (deal.score?.axes?.length) return deal.score.axes;
  return radarAxes(deal).map((a, i) => ({
    key: AXIS_ORDER[i],
    score: a.score,
    rationale: "",
    missing: [],
    risk: null,
  }));
}

export function strengths(deal: ScoredDeal): string[] {
  if (deal.score?.strengths?.length) return deal.score.strengths.slice(0, 3);
  const out: string[] = [];
  if (deal.sector) out.push(`${deal.sector} positioning`);
  if (deal.country) out.push(`Active in ${deal.country}`);
  if (deal.fundingSought) out.push(`Ask: ${deal.fundingSought}`);
  if (deal.founder) out.push(`Founder on file`);
  return out.slice(0, 3);
}

export function risks(deal: ScoredDeal): string[] {
  if (deal.score?.risks?.length) return deal.score.risks.slice(0, 3).map((r) => r.label);
  const out: string[] = [];
  if (!deal.valuation) out.push("Valuation not on file");
  if (!deal.pitchUrl) out.push("Pitch deck missing");
  if (!deal.investors) out.push("No co-investors listed");
  if (!deal.update) out.push("No recent update note");
  return out.slice(0, 3);
}

export function summary(deal: ScoredDeal): string {
  if (deal.score?.assessment) return deal.score.assessment;
  if (deal.description) return deal.description;
  if (deal.update) return deal.update.replace(/\*\*/g, "").slice(0, 280);
  return "No summary on file yet.";
}

export function daysInStage(deal: PipelineDeal, now = Date.now()): number {
  const raw = deal.dateUpdated || deal.dateEntered || deal.createdTime;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

export function workflowColumn(deal: ScoredDeal): WorkflowColumn {
  const stage = deal.score?.screeningStage;
  const gp = deal.score?.gpDecision;
  if (gp === "Pass" || gp === "Hold") return "pass";
  if (gp === "Advance" || stage === "Advanced") return "shortlisted";
  if (stage === "Review" || stage === "Assessed") return "reviewing";
  if (stage === "Enriched") return "screening";
  if (stage === "Received") return "intake";
  if (stage === "Rejected") return "pass";

  const st = (deal.status || "").toLowerCase();
  if (st === "déclinée") return "pass";
  if (st === "shortlistée" || st === "opportunité future" || st === "portfolio") return "shortlisted";
  if (st === "en étude") return "reviewing";
  if (st === "à contacter") return "intake";
  return "screening";
}

export function awaitingDecision(deal: ScoredDeal): boolean {
  const st = (deal.status || "").toLowerCase();
  if (st === "déclinée" || st === "portfolio") return false;
  if (deal.score?.gpDecision && deal.score.gpDecision !== "Pending") return false;
  return st === "en étude" || st === "en observation" || st === "à contacter" || st === "shortlistée" || !deal.status;
}

export function initials(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9À-ÿ\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function monthSeries(deals: PipelineDeal[], months = 8): number[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const map = new Map(keys.map((k) => [k, 0]));
  for (const deal of deals) {
    const raw = deal.dateEntered || deal.createdTime;
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (map.has(k)) map.set(k, (map.get(k) || 0) + 1);
  }
  return keys.map((k) => map.get(k) || 0);
}

export function internalSplit(deals: PipelineDeal[]): { internal: number; external: number; unspecified: number; pct: number } {
  let internal = 0;
  let external = 0;
  let unspecified = 0;
  for (const d of deals) {
    const c = sourceCategory(d.source);
    if (c === "internal") internal++;
    else if (c === "external") external++;
    else unspecified++;
  }
  const known = internal + external;
  return { internal, external, unspecified, pct: known ? Math.round((internal / known) * 100) : 0 };
}

export function avgScore(deals: ScoredDeal[]): number | null {
  const scored = deals.map(displayScore).filter((n): n is number => n != null);
  if (!scored.length) return null;
  return Math.round((scored.reduce((a, n) => a + n, 0) / scored.length) * 10) / 10;
}
