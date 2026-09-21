import type { ScoredDeal } from "@/types";

export function slimDeal(deal: ScoredDeal) {
  return {
    id: deal.id,
    name: deal.name,
    sector: deal.sector,
    country: deal.country,
    status: deal.status,
    fundingSought: deal.fundingSought,
    source: deal.source,
    founder: deal.founder,
    dateEntered: deal.dateEntered,
    dateUpdated: deal.dateUpdated,
    pitchUrl: deal.pitchUrl,
    valuation: deal.valuation,
    websiteUrl: deal.websiteUrl,
    description: deal.description ? deal.description.slice(0, 280) : null,
    score: deal.score
      ? {
          cvdScore: deal.score.cvdScore,
          gpDecision: deal.score.gpDecision,
          recommendation: deal.score.recommendation,
          aiRecommendation: deal.score.aiRecommendation,
          assessment: deal.score.assessment?.slice(0, 400) ?? null,
          axes: deal.score.axes,
          strengths: deal.score.strengths?.slice(0, 3) ?? [],
          risks: deal.score.risks?.slice(0, 3) ?? [],
        }
      : null,
  };
}

export type SlimDeal = ReturnType<typeof slimDeal>;
