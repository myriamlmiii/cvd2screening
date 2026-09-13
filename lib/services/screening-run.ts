import { getAIProvider } from "@/lib/ai/provider";
import { persistScreening, SCREENING_PROMPT_VERSION } from "@/lib/ai/persist";
import { supabaseAdmin } from "@/lib/services/supabase-rest";
import { logOp } from "@/lib/log";
import type { StartupRow } from "@/lib/domain/crm";

const SYSTEM = `You screen startups for a corporate venture team. Use only the provided facts and document excerpts. Never invent revenue, customers, or traction. Do not make a human Invest/Watch/Pass decision. Reply JSON only:
{"overall":0-100,"thesis":0-100,"product":0-100,"traction":0-100,"market":0-100,"competition":0-100,"recommendation":"Strong Fit"|"Review"|"Needs Information"|"Watch"|"Lower Priority","confidence":0-100,"summary":string,"evidence":string[],"risks":string[],"missingInformation":string[]}
Prefer Needs Information when the dossier is thin.`;

type Job = { id: string; startup_id: string | null; attempts: number | null };

export async function processQueuedScreenings(limit = 5): Promise<{ ran: number; failed: number }> {
  const stats = { ran: 0, failed: 0 };
  const provider = getAIProvider();
  if (!provider) return stats;
  const queued = await supabaseAdmin<Job[]>(
    `processing_jobs?type=eq.ai_screening&status=eq.QUEUED&select=id,startup_id,attempts&order=created_at.asc&limit=${limit}`,
  );
  if (!queued.ok || !queued.data?.length) return stats;

  for (const job of queued.data) {
    if (!job.startup_id) continue;
    await supabaseAdmin(`processing_jobs?id=eq.${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "PROCESSING", started_at: new Date().toISOString(), attempts: (job.attempts ?? 0) + 1 }),
    });
    try {
      const raw = await screenStartup(job.startup_id);
      if (!raw.ok) throw new Error(raw.error);
      await supabaseAdmin(`processing_jobs?id=eq.${job.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "COMPLETED", completed_at: new Date().toISOString(), error: null }),
      });
      stats.ran += 1;
    } catch (err) {
      stats.failed += 1;
      await supabaseAdmin(`processing_jobs?id=eq.${job.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "FAILED",
          completed_at: new Date().toISOString(),
          error: err instanceof Error ? err.message : "unknown",
        }),
      });
      logOp({ op: "screening.job", status: "error", jobId: job.id, error: err instanceof Error ? err.message : "unknown" });
    }
  }
  return stats;
}

async function screenStartup(startupId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await supabaseAdmin<StartupRow[]>(`startups?id=eq.${encodeURIComponent(startupId)}&select=id,name,description,sector,country,founders,funding_raw,source_type`);
  const startup = rows.data?.[0];
  if (!startup) return { ok: false, error: "startup missing" };
  const docs = await supabaseAdmin<{ filename: string | null; document_type: string | null; extracted_text: string | null }[]>(
    `startup_documents?startup_id=eq.${encodeURIComponent(startupId)}&select=filename,document_type,extracted_text&extracted_text=not.is.null&limit=8`,
  );
  const excerpts = (docs.data ?? [])
    .filter((d) => d.extracted_text && !/NDA|SIGNED_NDA|BENCHMARK/i.test(d.document_type || "") && !/nda|benchmark/i.test(d.filename || ""))
    .slice(0, 4)
    .map((d) => `${d.filename}: ${d.extracted_text!.slice(0, 1200)}`)
    .join("\n\n");
  const provider = getAIProvider();
  if (!provider) return { ok: false, error: "no groq key" };
  const text = await provider.complete([
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        `Company: ${startup.name}`,
        `Sector: ${startup.sector || "not on file"}`,
        `Country: ${startup.country || "not on file"}`,
        `Founders: ${startup.founders || "not on file"}`,
        `Funding: ${startup.funding_raw || "not on file"}`,
        `Source: ${startup.source_type || "not on file"}`,
        `Description: ${(startup.description || "not on file").slice(0, 1200)}`,
        `Document excerpts:\n${excerpts || "(none extracted)"}`,
        `prompt_version: ${SCREENING_PROMPT_VERSION}`,
      ].join("\n"),
    },
  ]);
  const saved = await persistScreening(
    startupId,
    {
      name: startup.name,
      description: startup.description,
      sector: startup.sector,
      country: startup.country,
      fundingSought: startup.funding_raw,
      update: null,
      founder: startup.founders,
    },
    text,
    "groq",
  );
  if (!saved.ok) return { ok: false, error: saved.error };
  return { ok: true };
}
