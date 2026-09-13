export const DOCUMENT_TYPES = [
  "APPLICATION",
  "QUESTIONNAIRE",
  "PITCH_DECK",
  "BUSINESS_PLAN",
  "NDA",
  "SIGNED_NDA",
  "BENCHMARK",
  "TRACTION",
  "TERM_SHEET",
  "FINANCIALS",
  "CALL_RECORDING",
  "FOLLOWUP",
  "OTHER",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  APPLICATION: "Application",
  QUESTIONNAIRE: "Questionnaire",
  PITCH_DECK: "Pitch Deck",
  BUSINESS_PLAN: "Business Plan",
  NDA: "NDA",
  SIGNED_NDA: "Signed NDA",
  BENCHMARK: "Benchmark",
  TRACTION: "Traction Report",
  TERM_SHEET: "Term Sheet",
  FINANCIALS: "Financials",
  CALL_RECORDING: "Call Recording",
  FOLLOWUP: "Follow-up",
  OTHER: "Other",
};

const LEGACY: Record<string, DocumentType> = {
  "Pitch/Business Plan": "PITCH_DECK",
  NDA: "NDA",
  Benchmark: "BENCHMARK",
  "Term Sheet": "TERM_SHEET",
  "Traction Report": "TRACTION",
  "Call Recording": "CALL_RECORDING",
  Financials: "FINANCIALS",
  Other: "OTHER",
};

export function normalizeDocumentType(raw: string | null | undefined): DocumentType {
  if (!raw) return "OTHER";
  if ((DOCUMENT_TYPES as readonly string[]).includes(raw)) return raw as DocumentType;
  return LEGACY[raw] ?? "OTHER";
}

const SIGNED = /signed|sign[eé]|ex[eé]cut[eé]/i;
const NDA = /nda|non[- ]disclosure/i;
const TERM = /term[- ]?sheet/i;
const CALL = /\bcall\b|recording|r[eé]union|meeting|\.mp4$|\.mov$|\.webm$/i;
const BENCH = /benchmark|comparatif/i;
const TRACTION = /traction|rapport/i;
const PITCH = /pitch/i;
const BP = /\bbp\b|business\s*plan|note\s+pr[eé]liminaire/i;
const FIN = /financial|financi|p&l|cap\s*table|budget|modele\s+eco|modèle\s+éco/i;
const QUEST = /questionnaire|q\s*&\s*a|formulaire/i;
const APP = /application|candidature/i;
const FOLLOW = /follow[- ]?up|prep|compte[- ]rendu/i;

export function classifyFromName(filename: string, mimeType?: string | null): DocumentType | null {
  const mime = (mimeType || "").toLowerCase();
  const name = filename;
  if (mime.startsWith("video/") || mime.includes("google-apps.video")) return "CALL_RECORDING";
  if (NDA.test(name) && SIGNED.test(name)) return "SIGNED_NDA";
  if (NDA.test(name)) return "NDA";
  if (TERM.test(name)) return "TERM_SHEET";
  if (CALL.test(name)) return "CALL_RECORDING";
  if (BENCH.test(name)) return "BENCHMARK";
  if (TRACTION.test(name)) return "TRACTION";
  if (PITCH.test(name)) return "PITCH_DECK";
  if (BP.test(name) || /\bprojet\b/i.test(name)) return "BUSINESS_PLAN";
  if (FIN.test(name)) return "FINANCIALS";
  if (QUEST.test(name)) return "QUESTIONNAIRE";
  if (APP.test(name)) return "APPLICATION";
  if (FOLLOW.test(name)) return "FOLLOWUP";
  return null;
}

/** @deprecated use classifyFromName — kept for existing UI filters */
export function keywordCategory(filename: string, mimeType?: string | null) {
  return classifyFromName(filename, mimeType);
}

export function descriptionPriority(filename: string): number {
  const n = filename.toLowerCase();
  if (n.includes("pitch")) return 1;
  if (/\bbp\b/.test(n) || n.includes("business plan") || n.includes("projet") || n.includes("note préliminaire") || n.includes("note preliminaire")) {
    return 2;
  }
  if (n.includes("traction") || n.includes("rapport")) return 3;
  return 99;
}

export function pickDescriptionText(docs: { filename: string; text: string | null | undefined }[]): string | null {
  const eligible = docs
    .filter((d) => d.text?.trim() && descriptionPriority(d.filename) < 99)
    .sort((a, b) => descriptionPriority(a.filename) - descriptionPriority(b.filename));
  const text = eligible[0]?.text?.trim();
  return text ? text.slice(0, 8000) : null;
}
