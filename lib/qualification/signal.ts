import { qualify, type Qualification } from "@/lib/qualify";
import type { PipelineDeal } from "@/types";

export type QualificationLabel = "Strong Fit" | "Relevant" | "Unclear";

export function qualificationLabel(q: Qualification): QualificationLabel {
  const sector = q.checks.find((c) => c.name === "sector")?.passed;
  const ai = q.checks.find((c) => c.name === "ai_layer")?.passed;
  if (sector && ai) return "Strong Fit";
  if (sector) return "Relevant";
  return "Unclear";
}

export function qualificationFor(deal: PipelineDeal) {
  const q = qualify(deal);
  return { ...q, label: qualificationLabel(q) };
}
