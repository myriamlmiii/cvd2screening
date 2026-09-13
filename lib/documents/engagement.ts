import type { DocumentType } from "@/lib/documents/categories";

export const ENGAGEMENT_SIGNALS = [
  "Application Only",
  "Materials Received",
  "Evaluation Materials",
  "Active Engagement",
] as const;

export type EngagementSignal = (typeof ENGAGEMENT_SIGNALS)[number];

export type EngagementFacts = {
  has_application: boolean;
  has_questionnaire: boolean;
  has_pitch_deck: boolean;
  has_financial_model: boolean;
  has_benchmark: boolean;
  has_traction_document: boolean;
  has_nda: boolean;
  has_signed_nda: boolean;
  has_call_recording: boolean;
  has_followup_material: boolean;
  last_document_received_at: string | null;
  document_count: number;
};

export const STALE_AFTER_MS = 180 * 86_400_000;

export function engagementFactsFromDocs(
  docs: { document_type?: string | null; filename?: string | null; modified_time?: string | null }[],
): EngagementFacts {
  const types = new Set(docs.map((d) => d.document_type || ""));
  const names = docs.map((d) => (d.filename || "").toLowerCase());
  const times = docs.map((d) => d.modified_time).filter(Boolean) as string[];
  times.sort();
  return {
    has_application: docs.length > 0,
    has_questionnaire: types.has("QUESTIONNAIRE") || names.some((n) => n.includes("questionnaire")),
    has_pitch_deck: types.has("PITCH_DECK") || types.has("BUSINESS_PLAN"),
    has_financial_model: types.has("FINANCIALS"),
    has_benchmark: types.has("BENCHMARK"),
    has_traction_document: types.has("TRACTION"),
    has_nda: types.has("NDA") || types.has("SIGNED_NDA"),
    has_signed_nda: types.has("SIGNED_NDA"),
    has_call_recording: types.has("CALL_RECORDING"),
    has_followup_material: types.has("FOLLOWUP"),
    last_document_received_at: times.at(-1) ?? null,
    document_count: docs.length,
  };
}

export function engagementSignalFromFacts(facts: EngagementFacts): EngagementSignal {
  if (facts.has_call_recording || (facts.has_signed_nda && facts.has_pitch_deck)) return "Active Engagement";
  if (facts.has_benchmark || facts.has_traction_document || facts.has_financial_model) return "Evaluation Materials";
  if (facts.has_pitch_deck || facts.has_questionnaire || facts.has_nda) return "Materials Received";
  return "Application Only";
}

export function evidenceIsStale(lastAt: string | null, now = Date.now()): boolean {
  if (!lastAt) return false;
  const t = new Date(lastAt).getTime();
  return Number.isFinite(t) && now - t > STALE_AFTER_MS;
}

/** Legacy three-bucket label — do not use as CRM workflow. */
export function engagementStageFromTypes(types: DocumentType[]): string {
  const facts = engagementFactsFromDocs(types.map((document_type) => ({ document_type })));
  return engagementSignalFromFacts(facts);
}
