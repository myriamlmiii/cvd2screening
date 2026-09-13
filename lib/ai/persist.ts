import { parseAiScore } from "@/lib/ai/schema";
import { screeningHash } from "@/lib/ai/hash";
import { supabaseAdmin } from "@/lib/services/supabase-rest";
import { recordActivity } from "@/lib/services/activity";
import { logOp } from "@/lib/log";
import type { PipelineDeal } from "@/types";

export const SCREENING_PROMPT_VERSION = "2026.09.screening.v1";

/** Persists a validated screening. Never writes human gp_decision. */
export async function persistScreening(startupId: string, deal: Pick<PipelineDeal, "name" | "description" | "sector" | "country" | "fundingSought" | "update" | "founder">, rawText: string, model: string) {
  const parsed = parseAiScore(rawText);
  const inputHash = screeningHash(deal);
  if (!parsed.ok) {
    await supabaseAdmin("startup_screenings", {
      method: "POST",
      body: JSON.stringify([{ startup_id: startupId, model, prompt_version: SCREENING_PROMPT_VERSION, input_hash: inputHash, status: "FAILED", error: parsed.error }]),
      prefer: "return=minimal",
    });
    logOp({ op: "screening.persist", status: "failed", startupId });
    return { ok: false as const, error: parsed.error };
  }
  const d = parsed.data;
  await supabaseAdmin("startup_screenings", {
    method: "POST",
    body: JSON.stringify([
      {
        startup_id: startupId,
        model,
        prompt_version: SCREENING_PROMPT_VERSION,
        input_hash: inputHash,
        overall_score: d.overall,
        thesis_score: d.thesis,
        product_score: d.product,
        traction_score: d.traction,
        market_score: d.market,
        competition_score: d.competition,
        result: d.recommendation,
        confidence: d.confidence,
        summary: d.summary,
        evidence: d.evidence,
        risks: d.risks,
        missing_information: d.missingInformation,
        status: "COMPLETED",
      },
    ]),
    prefer: "return=minimal",
  });
  await supabaseAdmin(`startups?id=eq.${encodeURIComponent(startupId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      screening_score: d.overall,
      screening_result: d.recommendation,
      screening_confidence: d.confidence,
    }),
  });
  await recordActivity(startupId, "SCREENING_COMPLETED", model);
  return { ok: true as const, data: d };
}
