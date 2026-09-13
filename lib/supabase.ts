/* ============================================================
   Read access to Supabase's `scored_deals` table (see
   supabase/schema.sql) — the AI-scored output of the Python
   pipeline in /backend.

   Server-side only, anon (read-only) key. When SUPABASE_URL /
   SUPABASE_ANON_KEY aren't set (no Supabase project wired up yet),
   this returns an empty map — screening views still render with
   real Airtable data, just with every score blank. Never fabricates
   a score.
   ============================================================ */

import { cache } from "react";
import type { DealScore } from "@/types";

const REVALIDATE_SECONDS = 60;
const skipScoreTables = new Set<string>();

type ScoredDealRow = {
  source_record_id: string;
  deal_id: string;
  screening_stage: DealScore["screeningStage"];
  gp_decision: DealScore["gpDecision"];
  qualified: boolean;
  rejection_reason: string | null;
  cvd_score: number | null;
  recommendation: DealScore["recommendation"];
  assessment: string | null;
  axes: DealScore["axes"];
  strengths: string[];
  risks: DealScore["risks"];
  deck_summary: string[];
  scored_at: string | null;
  updated_at: string;
  confidence?: number | null;
  evidence?: string[] | null;
  missing_information?: string[] | null;
  model?: string | null;
  prompt_version?: string | null;
  ai_recommendation?: DealScore["aiRecommendation"];
  data_completeness?: number | null;
};

function fromRow(row: ScoredDealRow): DealScore {
  return {
    sourceRecordId: row.source_record_id,
    dealId: row.deal_id,
    screeningStage: row.screening_stage,
    gpDecision: row.gp_decision,
    qualified: row.qualified,
    rejectionReason: row.rejection_reason,
    cvdScore: row.cvd_score,
    recommendation: row.recommendation,
    assessment: row.assessment,
    axes: row.axes ?? [],
    strengths: row.strengths ?? [],
    risks: row.risks ?? [],
    deckSummary: row.deck_summary ?? [],
    scoredAt: row.scored_at,
    updatedAt: row.updated_at,
    confidence: row.confidence ?? null,
    evidence: row.evidence ?? [],
    missingInformation: row.missing_information ?? [],
    model: row.model ?? null,
    promptVersion: row.prompt_version ?? null,
    aiRecommendation: row.ai_recommendation ?? null,
    dataCompleteness: row.data_completeness ?? null,
  };
}

/** sourceRecordId -> DealScore. Cached per request. Never fabricates scores. */
export const getScores = cache(async (): Promise<Map<string, DealScore>> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Map();
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const map = new Map<string, DealScore>();

  for (const table of ["screened_deals", "scored_deals"] as const) {
    if (skipScoreTables.has(table)) continue;
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}?select=*`, {
        headers,
        next: { revalidate: REVALIDATE_SECONDS },
      });
      if (!res.ok) {
        if (res.status === 404) skipScoreTables.add(table);
        continue;
      }
      const rows = (await res.json()) as Record<string, unknown>[];
      for (const raw of rows) {
        const id = String(raw.source_record_id || raw.deal_id || raw.startup_id || "");
        if (!id) continue;
        map.set(id, scoreFromUnknown(raw, id));
      }
      if (map.size) break;
    } catch {
      /* try next table */
    }
  }

  try {
    const res = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/startup_screenings?select=startup_id,overall_score,result,confidence,summary,evidence,risks,missing_information,created_at,model,prompt_version&order=created_at.desc&limit=2000`,
      { headers, next: { revalidate: REVALIDATE_SECONDS } },
    );
    if (res.ok) {
      const rows = (await res.json()) as Record<string, unknown>[];
      const seen = new Set<string>();
      for (const raw of rows) {
        const id = String(raw.startup_id || "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        if (map.has(id)) continue;
        map.set(id, scoreFromUnknown({
          source_record_id: id,
          deal_id: id,
          cvd_score: raw.overall_score,
          ai_recommendation: raw.result,
          assessment: raw.summary,
          confidence: raw.confidence,
          evidence: raw.evidence,
          missing_information: raw.missing_information,
          model: raw.model,
          prompt_version: raw.prompt_version,
          gp_decision: "Pending",
          screening_stage: "Assessed",
          qualified: false,
        }, id));
      }
    }
  } catch {
    /* screening table optional */
  }

  return map;
});

function scoreFromUnknown(row: Record<string, unknown>, id: string): DealScore {
  return fromRow({
    source_record_id: id,
    deal_id: String(row.deal_id || id),
    screening_stage: (row.screening_stage as DealScore["screeningStage"]) || "Assessed",
    gp_decision: (row.gp_decision as DealScore["gpDecision"]) || "Pending",
    qualified: Boolean(row.qualified),
    rejection_reason: (row.rejection_reason as string) || null,
    cvd_score: num(row.cvd_score ?? row.score ?? row.overall_score),
    recommendation: (row.recommendation as DealScore["recommendation"]) ?? null,
    assessment: (row.assessment as string) || (row.summary as string) || null,
    axes: (row.axes as DealScore["axes"]) || [],
    strengths: (row.strengths as string[]) || [],
    risks: (row.risks as DealScore["risks"]) || [],
    deck_summary: (row.deck_summary as string[]) || [],
    scored_at: (row.scored_at as string) || (row.created_at as string) || null,
    updated_at: (row.updated_at as string) || new Date().toISOString(),
    confidence: num(row.confidence),
    evidence: (row.evidence as string[]) || [],
    missing_information: (row.missing_information as string[]) || [],
    model: (row.model as string) || null,
    prompt_version: (row.prompt_version as string) || null,
    ai_recommendation: (row.ai_recommendation as DealScore["aiRecommendation"]) || (row.result as DealScore["aiRecommendation"]) || null,
    data_completeness: num(row.data_completeness),
  });
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export const isSupabaseConfigured = () =>
  Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
