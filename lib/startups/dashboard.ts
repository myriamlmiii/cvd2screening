import { countBy } from "@/lib/count-by";
import { awaitingReview, completenessPct, isStrongFit, prioritize, aiRecommendation } from "@/lib/crm";
import { avgScore, displayScore, internalSplit, monthSeries } from "@/lib/deal-view";
import { filterStartups, type StartupQuery } from "@/lib/startups/filter";
import { getScoredPipeline } from "@/lib/screening";
import { slimDeal } from "@/lib/startups/slim";
import { supabaseAnon } from "@/lib/services/supabase-rest";
import type { ScoredDeal } from "@/types";

async function crmSummary() {
  const row = await supabaseAnon<{ total: number; awaiting: number; strong_fits: number }[]>("crm_pipeline_summary?select=total,awaiting,strong_fits");
  if (!row.ok || !row.data?.[0]?.total) return null;
  return row.data[0];
}

async function crmMonthly(): Promise<number[] | null> {
  const row = await supabaseAnon<{ month: string; n: number }[]>("crm_monthly_volume?select=month,n&order=month.asc");
  if (!row.ok || !row.data?.length) return null;
  return row.data.slice(-8).map((r) => r.n);
}

export async function getOverviewPayload(filters: Pick<StartupQuery, "status" | "sector" | "origin">) {
  const deals = await getScoredPipeline();
  const filtered = filterStartups(deals, {
    q: "",
    status: filters.status,
    sector: filters.sector,
    origin: filters.origin,
    rec: "all",
    queue: "0",
    sort: "score",
    page: 0,
    pageSize: 8,
  });
  const awaitingList = deals.filter(awaitingReview);
  const strong = deals.filter(isStrongFit);
  const queue = prioritize(filtered.filter(awaitingReview)).slice(0, 8);
  const summary = await crmSummary();
  const sparkDb = await crmMonthly();
  return {
    total: summary?.total ?? deals.length,
    awaiting: summary?.awaiting ?? awaitingList.length,
    strongFits: summary?.strong_fits ?? strong.length,
    insight: insight(deals),
    spark: sparkDb ?? monthSeries(deals),
    awaitingSpark: monthSeries(awaitingList),
    statuses: countBy(deals, (d) => d.status),
    sectors: countBy(deals, (d) => d.sector).slice(0, 24),
    countries: countBy(filtered, (d) => d.country),
    cards: queue.slice(0, 3),
    queue: queue.map(slimDeal),
  };
}

export async function getAnalyticsPayload(page = 0, pageSize = 24) {
  const deals = await getScoredPipeline();
  const spark = monthSeries(deals);
  const dist = scoreDist(deals);
  return {
    total: deals.length,
    average: avgScore(deals),
    split: internalSplit(deals),
    spark,
    countries: countBy(deals, (d) => d.country),
    sectors: countBy(deals, (d) => d.sector),
    dist,
    waiting: deals.filter(awaitingReview).length,
    avgComplete: deals.length ? Math.round(deals.reduce((a, d) => a + completenessPct(d), 0) / deals.length) : 0,
    inflow: spark.length >= 2 ? spark[spark.length - 1] - spark[0] : 0,
    landscape: deals
      .filter((d) => displayScore(d) != null)
      .slice(0, 220)
      .map((d) => ({
        id: d.id,
        name: d.name,
        score: displayScore(d),
        completeness: completenessPct(d),
        rec: aiRecommendation(d),
      })),
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(deals.length / pageSize)),
    rows: deals.slice(page * pageSize, page * pageSize + pageSize).map(slimDeal),
  };
}

export async function getWorkflowPayload(sector = "all") {
  const { WORKFLOW_COLUMNS, workflowColumn, avgScore, displayScore } = await import("@/lib/deal-view");
  const deals = await getScoredPipeline();
  const filtered = sector === "all" ? deals : deals.filter((d) => (d.sector || "—") === sector);
  const grouped = WORKFLOW_COLUMNS.map((col) => {
    const items = filtered.filter((d) => workflowColumn(d) === col.id).sort((a, b) => (displayScore(b) ?? -1) - (displayScore(a) ?? -1));
    return { ...col, count: items.length, items: items.slice(0, 8) };
  });
  const reviewingItems = filtered.filter((d) => workflowColumn(d) === "reviewing");
  const log = [...filtered]
    .sort((a, b) => String(b.dateUpdated || b.dateEntered || "").localeCompare(String(a.dateUpdated || a.dateEntered || "")))
    .slice(0, 6)
    .map(slimDeal);
  return {
    total: filtered.length,
    universe: deals.length,
    split: internalSplit(filtered),
    average: avgScore(filtered),
    reviewingScore: avgScore(reviewingItems),
    sectors: countBy(deals, (d) => d.sector),
    columns: grouped,
    log,
    rings: {
      count: filtered.length,
      split: internalSplit(filtered).pct,
      average: avgScore(filtered),
    },
  };
}

export type OverviewPayload = Awaited<ReturnType<typeof getOverviewPayload>>;
export type AnalyticsPayload = Awaited<ReturnType<typeof getAnalyticsPayload>>;
export type WorkflowPayload = Awaited<ReturnType<typeof getWorkflowPayload>>;

function insight(deals: ScoredDeal[]) {
  const cutoff = Date.now() - 60 * 86_400_000;
  const recent = deals.filter((d) => {
    const raw = d.dateEntered || d.createdTime;
    if (!raw) return false;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
  if (!recent.length) return null;
  const focus = recent.filter((d) => /fintech|cyber|insur/i.test(d.sector || "")).length;
  const pct = Math.round((focus / recent.length) * 100);
  return `${pct}% of applications received during the last 60 days are in Fintech, Cybertech or InsurTech (${focus}/${recent.length}).`;
}

function scoreDist(deals: ScoredDeal[]) {
  const bins = [
    { min: 0, max: 40, n: 0 },
    { min: 40, max: 50, n: 0 },
    { min: 50, max: 60, n: 0 },
    { min: 60, max: 70, n: 0 },
    { min: 70, max: 80, n: 0 },
    { min: 80, max: 90, n: 0 },
    { min: 90, max: 101, n: 0 },
  ];
  for (const d of deals) {
    const s = displayScore(d);
    if (s == null) continue;
    const bin = bins.find((b) => s >= b.min && s < b.max);
    if (bin) bin.n += 1;
  }
  return bins.map((b, i) => ({ name: String(i + 1), n: b.n }));
}
