import { getAIProvider } from "@/lib/ai/provider";
import {
  DOCUMENT_TYPES,
  classifyFromName,
  normalizeDocumentType,
  type DocumentType,
} from "@/lib/documents/categories";

export { classifyFromName, pickDescriptionText, descriptionPriority } from "@/lib/documents/categories";
export { engagementStageFromTypes } from "@/lib/documents/engagement";
export type { DocumentType };

const ALLOWED = new Set<string>(DOCUMENT_TYPES);

export async function classifyDocument(input: {
  filename: string;
  mimeType?: string | null;
  excerpt?: string | null;
  cached?: string | null;
}): Promise<{ category: DocumentType; source: "KEYWORD" | "MIME" | "GROQ" | "CACHED"; confidence: number }> {
  const fromRules = classifyFromName(input.filename, input.mimeType);
  if (fromRules) {
    const mime = (input.mimeType || "").toLowerCase();
    const source = mime.startsWith("video/") && fromRules === "CALL_RECORDING" ? "MIME" : "KEYWORD";
    return { category: fromRules, source, confidence: source === "MIME" ? 0.95 : 0.9 };
  }
  if (input.cached) {
    const cached = normalizeDocumentType(input.cached);
    if (cached !== "OTHER" || input.cached === "OTHER" || input.cached === "Other") {
      return { category: cached, source: "CACHED", confidence: 0.85 };
    }
  }
  const groq = await classifyWithGroq(input.filename, input.excerpt);
  if (groq) return { category: groq, source: "GROQ", confidence: 0.62 };
  return { category: "OTHER", source: "KEYWORD", confidence: 0.3 };
}

async function classifyWithGroq(filename: string, excerpt?: string | null): Promise<DocumentType | null> {
  const provider = getAIProvider();
  if (!provider) return null;
  const text = (excerpt || "").replace(/\s+/g, " ").slice(0, 500);
  try {
    const raw = await provider.complete([
      {
        role: "system",
        content:
          'Classify a startup-folder file into exactly one type. Reply JSON only: {"category":"..."}. Types: APPLICATION, QUESTIONNAIRE, PITCH_DECK, BUSINESS_PLAN, NDA, SIGNED_NDA, BENCHMARK, TRACTION, TERM_SHEET, FINANCIALS, CALL_RECORDING, FOLLOWUP, OTHER.',
      },
      {
        role: "user",
        content: `Filename: ${filename}\nExcerpt: ${text || "(none)"}`,
      },
    ]);
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] || raw) as { category?: string };
    const category = parsed.category?.trim();
    if (category && ALLOWED.has(category)) return category as DocumentType;
  } catch {
    return null;
  }
  return null;
}
