import { z } from "zod";
import { countBy } from "@/lib/count-by";
import { aiRecommendation, awaitingReview, crmStatus } from "@/lib/crm";
import { sortScore } from "@/lib/deal-view";
import { sourceCategory } from "@/lib/source-category";
import type { ScoredDeal } from "@/types";

export const startupQuerySchema = z.object({
  q: z.string().optional().default(""),
  status: z.string().optional().default("all"),
  sector: z.string().optional().default("all"),
  origin: z.string().optional().default("all"),
  rec: z.string().optional().default("all"),
  queue: z.enum(["0", "1"]).optional().default("0"),
  sort: z.enum(["score", "updated", "name", "entered"]).optional().default("score"),
  page: z.coerce.number().int().min(0).optional().default(0),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(40),
  id: z.string().optional(),
});

export type StartupQuery = z.infer<typeof startupQuerySchema>;

export function filterStartups(deals: ScoredDeal[], query: StartupQuery): ScoredDeal[] {
  const needle = query.q.trim().toLowerCase();
  const rows = deals.filter((d) => {
    if (query.queue === "1" && !awaitingReview(d)) return false;
    if (query.status !== "all" && (d.status || "—") !== query.status && crmStatus(d) !== query.status) return false;
    if (query.sector !== "all" && (d.sector || "—") !== query.sector) return false;
    if (query.origin !== "all" && sourceCategory(d.source) !== query.origin) return false;
    if (query.rec !== "all" && aiRecommendation(d) !== query.rec) return false;
    if (!needle) return true;
    const hay = [d.name, d.sector, d.country, d.status, d.founder, d.source, d.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });

  rows.sort((a, b) => {
    if (query.sort === "name") return a.name.localeCompare(b.name);
    if (query.sort === "updated") return String(b.dateUpdated || "").localeCompare(String(a.dateUpdated || ""));
    if (query.sort === "entered") return String(b.dateEntered || b.createdTime || "").localeCompare(String(a.dateEntered || a.createdTime || ""));
    return sortScore(b) - sortScore(a);
  });
  return rows;
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const start = page * pageSize;
  return { rows: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
}

export function facets(deals: ScoredDeal[]) {
  return {
    statuses: countBy(deals, (d) => d.status),
    sectors: countBy(deals, (d) => d.sector).slice(0, 40),
  };
}
