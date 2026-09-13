/* ============================================================
   Merges canonical CRM startups (Supabase) when present, otherwise
   Airtable PIPELINE + scored_deals. Never fabricates scores.
   ============================================================ */

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getPipeline } from "@/lib/airtable";
import { getScores } from "@/lib/supabase";
import { supabaseAnon } from "@/lib/services/supabase-rest";
import { mergeCrmWithFallback } from "@/lib/startups/merge";
import { startupRowToDeal } from "@/lib/startups/from-row";
import type { StartupRow } from "@/lib/domain/crm";
import type { ScoredDeal } from "@/types";

const LIST_SELECT =
  "id,name,normalized_name,description,website,normalized_domain,sector,subsector,stage,geography,country,city,founders,funding_total,funding_currency,funding_raw,product_description,market_description,competition,source_type,date_received,crm_status,screening_result,screening_score,screening_confidence,data_completeness,content_hash,possible_duplicate_of,created_at,updated_at";

async function loadFromCrm(): Promise<ScoredDeal[] | null> {
  const result = await supabaseAnon<StartupRow[]>(`startups?select=${LIST_SELECT}&limit=5000`);
  if (!result.ok || !result.data?.length) return null;
  const scores = await getScores();
  return result.data.map((row) => {
    const deal = startupRowToDeal(row);
    const scored = scores.get(row.id) ?? null;
    if (!scored) return deal;
    return {
      ...deal,
      score: {
        ...scored,
        aiRecommendation: scored.aiRecommendation ?? deal.score?.aiRecommendation,
        dataCompleteness: scored.dataCompleteness ?? deal.score?.dataCompleteness,
      },
    };
  });
}

const loadPipeline = unstable_cache(
  async () => {
    const [crm, pipeline, scores] = await Promise.all([loadFromCrm(), getPipeline(), getScores()]);
    const scoredFallback = pipeline.map((deal) => ({ ...deal, score: scores.get(deal.id) ?? null }));
    return mergeCrmWithFallback(crm ?? [], scoredFallback);
  },
  ["scored-pipeline-v3"],
  { revalidate: 60 },
);

export const getScoredPipeline = cache(async (): Promise<ScoredDeal[]> => loadPipeline());

export async function getScoredOnly(): Promise<ScoredDeal[]> {
  return (await getScoredPipeline()).filter((d) => d.score?.cvdScore != null);
}

async function driveDocsFor(startupId: string): Promise<
  {
    label: string;
    href: string;
    documentType?: string | null;
    mimeType?: string | null;
    size?: number | null;
    extractionStatus?: string | null;
    missing?: boolean;
  }[]
> {
  const docs = await supabaseAnon<
    {
      external_file_id: string;
      filename: string | null;
      source_url: string | null;
      document_type: string | null;
      mime_type: string | null;
      byte_size: number | null;
      extraction_status: string | null;
      missing_since: string | null;
      processing_status?: string | null;
      document_version?: number | null;
      is_latest?: boolean | null;
      modified_time?: string | null;
    }[]
  >(
    `startup_documents?startup_id=eq.${encodeURIComponent(startupId)}&select=external_file_id,filename,source_url,document_type,mime_type,byte_size,extraction_status,missing_since&order=filename.asc&limit=200`,
  );
  const rows = docs.ok && docs.data ? docs.data : [];
  return rows.map((d) => ({
    label: d.filename || "Drive file",
    href: `/api/documents/${encodeURIComponent(d.external_file_id)}/open`,
    documentType: d.document_type,
    mimeType: d.mime_type,
    size: d.byte_size,
    extractionStatus: d.extraction_status,
    missing: Boolean(d.missing_since),
  }));
}

export async function getStartupById(id: string): Promise<ScoredDeal | undefined> {
  const one = await supabaseAnon<StartupRow[]>(`startups?id=eq.${encodeURIComponent(id)}&select=${LIST_SELECT}`);
  if (one.ok && one.data?.[0]) {
    const scores = await getScores();
    const deal = startupRowToDeal(one.data[0]);
    const scored = scores.get(id) ?? null;
    const driveDocuments = await driveDocsFor(id);
    return {
      ...deal,
      driveDocuments,
      score: scored
        ? { ...scored, aiRecommendation: scored.aiRecommendation ?? deal.score?.aiRecommendation }
        : deal.score,
    };
  }
  const fromPipeline = (await getScoredPipeline()).find((d) => d.id === id);
  if (!fromPipeline) return undefined;
  const driveDocuments = await driveDocsFor(id);
  return { ...fromPipeline, driveDocuments };
}
