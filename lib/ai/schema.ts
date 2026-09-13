import { z } from "zod";
import type { AiRecommendation } from "@/types";

export const AI_RECS = ["Strong Fit", "Review", "Needs Information", "Watch", "Lower Priority"] as const;

export const aiMemoSchema = z.object({
  recommendation: z.enum(AI_RECS),
  conviction: z.enum(["High", "Medium", "Low"]).default("Medium"),
  thesis: z.string().max(800),
  justification: z.array(z.string()).max(6).default([]),
  gaps: z.array(z.string()).max(6).default([]),
  nextAction: z.string().max(400).default(""),
});

export type AiMemo = z.infer<typeof aiMemoSchema>;

export const aiScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  thesis: z.number().min(0).max(100),
  product: z.number().min(0).max(100),
  traction: z.number().min(0).max(100),
  market: z.number().min(0).max(100),
  competition: z.number().min(0).max(100),
  recommendation: z.enum(AI_RECS),
  confidence: z.number().min(0).max(100),
  summary: z.string().max(2000),
  evidence: z.array(z.string()).max(8),
  risks: z.array(z.string()).max(8),
  missingInformation: z.array(z.string()).max(8),
});

export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no json object");
  return JSON.parse(trimmed.slice(start, end + 1));
}

export function parseAiMemo(text: string): AiMemo | null {
  try {
    return aiMemoSchema.parse(parseJsonObject(text));
  } catch {
    return null;
  }
}

export function parseAiScore(text: string) {
  try {
    return { ok: true as const, data: aiScoreSchema.parse(parseJsonObject(text)) };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "invalid AI score",
    };
  }
}
