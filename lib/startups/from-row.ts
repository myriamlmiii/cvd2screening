import { mapAirtableStatus } from "@/lib/services/normalize-service";
import type { StartupRow } from "@/lib/domain/crm";
import type { AiRecommendation, CrmStatus, ScoredDeal } from "@/types";

export function screeningResultToUi(result: string | null): AiRecommendation {
  if (result === "Strong Match" || result === "Strong Fit") return "Strong Fit";
  if (result === "Relevant" || result === "Review") return "Review";
  if (result === "Weak Match" || result === "Watch") return "Watch";
  if (result === "Out of Scope" || result === "Lower Priority") return "Lower Priority";
  return "Needs Information";
}

export function crmStatusToUi(status: string | null): CrmStatus {
  const canonical = mapAirtableStatus(status);
  if (canonical === "Screening" || canonical === "Review") return "Reviewing";
  if (canonical === "Passed") return "Passed";
  if (canonical === "Shortlisted") return "Shortlisted";
  if (canonical === "New") return "New";
  return "En Observation";
}

export function startupRowToDeal(row: StartupRow): ScoredDeal {
  return {
    id: row.id,
    createdTime: row.created_at,
    name: row.name,
    dateEntered: row.date_received,
    fundingSought: row.funding_raw,
    description: row.description,
    pitchUrl: null,
    ficheUrl: null,
    sector: row.sector,
    country: row.country,
    status: row.crm_status,
    dateUpdated: row.updated_at,
    update: null,
    bpUrl: null,
    benchmarkUrl: null,
    demoUrl: null,
    valuation: null,
    investors: null,
    websiteUrl: row.website,
    marketStudyUrl: null,
    founder: row.founders,
    email: null,
    whatsapp: null,
    ndaUrl: null,
    termSheetUrl: null,
    dossierUrl: null,
    source: row.source_type,
    engagementStage: row.engagement_stage,
    score: row.screening_score == null
      ? null
      : {
          sourceRecordId: row.id,
          dealId: row.id,
          screeningStage: "Assessed",
          gpDecision: "Pending",
          qualified: false,
          rejectionReason: null,
          cvdScore: row.screening_score,
          recommendation: null,
          assessment: null,
          axes: [],
          strengths: [],
          risks: [],
          deckSummary: [],
          scoredAt: row.updated_at,
          updatedAt: row.updated_at,
          aiRecommendation: screeningResultToUi(row.screening_result),
          dataCompleteness: row.data_completeness,
          confidence: row.screening_confidence,
        },
  };
}
