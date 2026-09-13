import { qualify } from "@/lib/qualify";
import { coverageScore, displayScore } from "@/lib/deal-view";
import type { AiRecommendation, CompletenessBand, CrmStatus, ScoredDeal, SourceType } from "@/types";

export const CRM_STATUSES: CrmStatus[] = ["New", "En Observation", "Reviewing", "Shortlisted", "Selected", "Passed"];

export const AI_RECS: AiRecommendation[] = ["Strong Fit", "Review", "Needs Information", "Watch", "Lower Priority"];

export function crmStatus(deal: ScoredDeal): CrmStatus {
  const gp = deal.score?.gpDecision;
  if (gp === "Pass") return "Passed";
  if (gp === "Advance") return "Selected";
  if (gp === "Hold") return "Shortlisted";

  const st = (deal.status || "").toLowerCase();
  if (st === "déclinée") return "Passed";
  if (st === "portfolio") return "Selected";
  if (st === "shortlistée" || st === "opportunité future" || st === "shortlisted") return "Shortlisted";
  if (st === "en étude" || st === "reviewing" || st === "review" || st === "screening") return "Reviewing";
  if (st === "en observation") return "En Observation";
  if (st === "à contacter" || st === "new" || !deal.status) return "New";
  if (st === "passed") return "Passed";
  return "En Observation";
}

export function awaitingReview(deal: ScoredDeal): boolean {
  const s = crmStatus(deal);
  return s === "New" || s === "En Observation" || s === "Reviewing";
}

export function aiRecommendation(deal: ScoredDeal): AiRecommendation {
  if (deal.score?.aiRecommendation) return deal.score.aiRecommendation;
  const rec = deal.score?.recommendation;
  if (rec === "Advance") return "Strong Fit";
  if (rec === "Review") return "Review";
  if (rec === "Hold") return "Watch";
  if (rec === "Reject") return "Lower Priority";
  const score = deal.score?.cvdScore;
  if (score == null) return "Needs Information";
  if (score >= 75) return "Strong Fit";
  if (score >= 55) return "Review";
  if (score >= 40) return "Watch";
  return "Lower Priority";
}

export function isStrongFit(deal: ScoredDeal): boolean {
  return aiRecommendation(deal) === "Strong Fit";
}

export function completenessBand(deal: ScoredDeal): CompletenessBand {
  const pct = deal.score?.dataCompleteness ?? coverageScore(deal);
  if (pct >= 80) return "Complete";
  if (pct >= 40) return "Partial";
  return "Missing";
}

export function completenessPct(deal: ScoredDeal): number {
  return deal.score?.dataCompleteness ?? coverageScore(deal);
}

export function sourceType(deal: ScoredDeal): SourceType {
  const s = (deal.source || "").toLowerCase();
  if (s.includes("drive") || s.includes("gdrive")) return "GOOGLE_DRIVE";
  if (s.includes("inbound") || s.includes("website") || s.includes("formulaire") || s.includes("application")) return "DIRECT_APPLICATION";
  if (s.includes("email") || s.includes("mail")) return "EMAIL";
  if (s.includes("referral") || s.includes("intro") || s.includes("recommand")) return "REFERRAL";
  if (s.includes("crunchbase")) return "CRUNCHBASE";
  if (s.includes("github")) return "GITHUB";
  if (s.includes("manual") || s.includes("saisie")) return "MANUAL_ENTRY";
  if (deal.source) return "AIRTABLE";
  return "AIRTABLE";
}

export function sourceDocuments(deal: ScoredDeal): {
  label: string;
  href: string;
  documentType?: string | null;
  mimeType?: string | null;
  size?: number | null;
  extractionStatus?: string | null;
  missing?: boolean;
}[] {
  const fromFile = [
    deal.websiteUrl && { label: "Website", href: deal.websiteUrl, documentType: "Other" },
    deal.pitchUrl && { label: "Pitch", href: deal.pitchUrl, documentType: "Pitch/Business Plan" },
    deal.ficheUrl && { label: "Fiche", href: deal.ficheUrl, documentType: "Other" },
    deal.bpUrl && { label: "Business plan", href: deal.bpUrl, documentType: "Pitch/Business Plan" },
    deal.demoUrl && { label: "Demo", href: deal.demoUrl, documentType: "Other" },
    deal.dossierUrl && { label: "Dossier", href: deal.dossierUrl, documentType: "Other" },
    deal.marketStudyUrl && { label: "Market study", href: deal.marketStudyUrl, documentType: "Other" },
    deal.ndaUrl && { label: "NDA", href: deal.ndaUrl, documentType: "NDA" },
    deal.termSheetUrl && { label: "Term sheet", href: deal.termSheetUrl, documentType: "Term Sheet" },
  ].filter(Boolean) as { label: string; href: string; documentType: string }[];
  const fromDrive = (deal.driveDocuments ?? []).filter((d) => d.href);
  return [...fromFile, ...fromDrive];
}

export function attentionReasons(deal: ScoredDeal): string[] {
  const reasons: string[] = [];
  const rec = aiRecommendation(deal);
  if (rec === "Strong Fit") reasons.push("strong AI fit vs current thesis");
  if (rec === "Review") reasons.push("worth a human look");
  if (rec === "Needs Information") reasons.push("missing information that needs investigation");
  const q = qualify(deal);
  if (q.checks.find((c) => c.name === "sector")?.passed) reasons.push("thesis / sector alignment");
  if (q.matchedAiTerms.length) reasons.push("AI-native language on file");
  const geo = (deal.country || "").toLowerCase();
  if (geo.includes("maroc") || geo.includes("morocco") || geo.includes("france") || geo.includes("europe")) {
    reasons.push("target geography");
  }
  if (deal.dateUpdated) {
    const t = new Date(deal.dateUpdated).getTime();
    if (Number.isFinite(t) && Date.now() - t < 14 * 86_400_000) reasons.push("recent activity");
  }
  if (!deal.description || !deal.pitchUrl) reasons.push("incomplete application");
  return reasons.slice(0, 4);
}

export function prioritize(deals: ScoredDeal[]): ScoredDeal[] {
  const rank: Record<AiRecommendation, number> = {
    "Strong Fit": 0,
    Review: 1,
    "Needs Information": 2,
    Watch: 3,
    "Lower Priority": 4,
  };
  return [...deals].sort((a, b) => {
    const rec = rank[aiRecommendation(a)] - rank[aiRecommendation(b)];
    if (rec !== 0) return rec;
    return (displayScore(b) ?? -1) - (displayScore(a) ?? -1);
  });
}

export function duplicateKey(name: string, website?: string | null): string {
  const domain = (website || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return domain || n;
}
