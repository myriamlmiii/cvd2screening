/* ============================================================
   CVD 2.0 — data model.
   The dashboard reads the SITUATIONS Airtable base (tables
   PIPELINE and PORTFOLIO), either live or from a committed
   snapshot. These interfaces are the shape after normalisation
   in lib/airtable.ts — every optional field is `string | null`
   because the source data is genuinely sparse.
   ============================================================ */

export type StatusTone = "positive" | "warning" | "critical" | "info" | "neutral";

/** PIPELINE table — one row per sourced company. */
export interface PipelineDeal {
  id: string;
  createdTime: string | null;
  name: string;
  dateEntered: string | null; // ISO date
  fundingSought: string | null; // free text, e.g. "800 k€ pour 16,6% (Seed)"
  description: string | null;
  pitchUrl: string | null;
  ficheUrl: string | null;
  sector: string | null;
  country: string | null;
  status: string | null; // "En observation" | "Déclinée" | "Opportunité future" | "Portfolio" | …
  dateUpdated: string | null; // ISO date
  update: string | null; // running notes, markdown-ish
  bpUrl: string | null;
  benchmarkUrl: string | null;
  demoUrl: string | null;
  valuation: string | null; // free text
  investors: string | null;
  websiteUrl: string | null;
  marketStudyUrl: string | null;
  founder: string | null;
  email: string | null;
  whatsapp: string | null;
  ndaUrl: string | null;
  termSheetUrl: string | null;
  dossierUrl: string | null;
  source: string | null;
}

/** PORTFOLIO table — one row per investment. */
export interface PortfolioCompany {
  id: string;
  createdTime: string | null;
  name: string;
  situation: string | null;
  sector: string | null;
  country: string | null;
  round: string | null;
  investDate: string | null; // free text, e.g. "Septembre 2024"
  investCvd: string | null; // e.g. "200 K€"
  investHolmarcom: string | null;
  pctCvd: string | null; // e.g. "3,0%"
  pctHolmarcom: string | null;
  pctTotal: string | null;
  position: string | null; // "Lead" | "Follower" | …
  instrument: string | null; // "Equity" | "SAFE" | …
  valoInitial: string | null;
  valoFinal: string | null;
  exchanges: string | null; // negotiation duration
  negotiationPoints: string | null;
  ficheUrl: string | null;
  dossierUrl: string | null;
  source: string | null;
  unexpectedEvents: string | null;
  mrrBeforeInvest: string | null; // k€
  mrrTargetDec26: string | null; // k€
  monthlyBurn: string | null; // k€
  revenueFy2025: string | null; // k€
  ebitdaFy2025: string | null; // k€
  runwayEnd: string | null; // e.g. "juin-27"
  nextRound: string | null;
}

export interface Snapshot {
  syncedAt: string;
  source: string;
  live: boolean; // true when served straight from the Airtable API
  pipeline: PipelineDeal[];
  portfolio: PortfolioCompany[];
}

/* ============================================================
   Screening — AI score, read from Supabase's `scored_deals`
   (see supabase/schema.sql), written by the Python pipeline in
   /backend. Joined onto a PipelineDeal by `sourceRecordId`
   (Airtable's own record id). A deal with no row here simply
   hasn't been scored yet — never fabricated.
   ============================================================ */

export type Recommendation = "Advance" | "Review" | "Hold" | "Reject";
export type ScreeningStage = "Received" | "Enriched" | "Assessed" | "Review" | "Advanced" | "Rejected";
export type AxisKey = "thesis" | "product" | "traction" | "market" | "competition";

export type CrmStatus = "New" | "En Observation" | "Reviewing" | "Shortlisted" | "Selected" | "Passed";
export type AiRecommendation =
  | "Strong Fit"
  | "Review"
  | "Needs Information"
  | "Watch"
  | "Lower Priority";
export type CompletenessBand = "Complete" | "Partial" | "Missing";
export type SourceType =
  | "DIRECT_APPLICATION"
  | "EMAIL"
  | "REFERRAL"
  | "AIRTABLE"
  | "GOOGLE_DRIVE"
  | "CRUNCHBASE"
  | "GITHUB"
  | "WEB_DISCOVERY"
  | "MANUAL_ENTRY";
export type HumanDecision = "Invest" | "Watch" | "Pass";

export interface ScoreAxis {
  key: AxisKey;
  score: number;
  rationale: string;
  missing: string[];
  risk: string | null;
  evidence?: string | null;
}

export interface Risk {
  label: string;
  detail: string;
  severity: "High" | "Medium" | "Low";
}

/** One row of `scored_deals`, camelCased. */
export interface DealScore {
  sourceRecordId: string;
  dealId: string;
  screeningStage: ScreeningStage;
  gpDecision: "Pending" | "Advance" | "Hold" | "Pass";
  qualified: boolean;
  rejectionReason: string | null;
  cvdScore: number | null;
  recommendation: Recommendation | null;
  assessment: string | null;
  axes: ScoreAxis[];
  strengths: string[];
  risks: Risk[];
  deckSummary: string[];
  scoredAt: string | null;
  updatedAt: string;
  confidence?: number | null;
  evidence?: string[];
  missingInformation?: string[];
  model?: string | null;
  promptVersion?: string | null;
  aiRecommendation?: AiRecommendation | null;
  dataCompleteness?: number | null;
}

/** A PIPELINE row with whatever score data exists for it attached. */
export type ScoredDeal = PipelineDeal & {
  score: DealScore | null;
  driveDocuments?: DriveDocument[];
  engagementStage?: string | null;
};

export type DriveDocument = {
  label: string;
  href: string;
  documentType?: string | null;
  mimeType?: string | null;
  size?: number | null;
  extractionStatus?: string | null;
  missing?: boolean;
};
