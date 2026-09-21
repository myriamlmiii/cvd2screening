import { getPipeline, getPortfolio } from "@/lib/airtable";
import { supabaseAdmin } from "@/lib/services/supabase-rest";
import { loadIdentityCandidates, upsertFromRaw } from "@/lib/services/startup-service";
import { contentHash } from "@/lib/normalize";
import type { PipelineDeal } from "@/types";

function googleFileId(url: string): string {
  const m =
    url.match(/\/(?:file\/d|folders|document\/d|spreadsheets\/d|presentation\/d)\/([a-zA-Z0-9_-]{10,})/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  return m?.[1] || contentHash([url]).slice(0, 28);
}

function linksFromDeal(deal: PipelineDeal): { label: string; href: string; type: string }[] {
  return [
    deal.pitchUrl && { label: "Pitch", href: deal.pitchUrl, type: "PITCH_DECK" },
    deal.ficheUrl && { label: "Fiche U-investors", href: deal.ficheUrl, type: "OTHER" },
    deal.bpUrl && { label: "Business plan", href: deal.bpUrl, type: "BUSINESS_PLAN" },
    deal.benchmarkUrl && { label: "Benchmark", href: deal.benchmarkUrl, type: "BENCHMARK" },
    deal.demoUrl && { label: "Demo", href: deal.demoUrl, type: "OTHER" },
    deal.dossierUrl && { label: "Data room", href: deal.dossierUrl, type: "OTHER" },
    deal.marketStudyUrl && { label: "Étude de marché", href: deal.marketStudyUrl, type: "OTHER" },
    deal.ndaUrl && { label: "NDA", href: deal.ndaUrl, type: "NDA" },
    deal.termSheetUrl && { label: "Term sheet", href: deal.termSheetUrl, type: "TERM_SHEET" },
  ].filter(Boolean) as { label: string; href: string; type: string }[];
}

async function writeLinkedDoc(row: Record<string, unknown>) {
  const full = await supabaseAdmin("startup_documents", {
    method: "POST",
    body: JSON.stringify([row]),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  if (full.ok || full.status === 409) return full;
  const core = {
    startup_id: row.startup_id,
    source_type: "GOOGLE_DRIVE",
    external_file_id: row.external_file_id,
    filename: row.filename,
    source_url: row.source_url,
    content_hash: row.content_hash,
    extraction_status: "SKIPPED",
  };
  return supabaseAdmin("startup_documents", {
    method: "POST",
    body: JSON.stringify([core]),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}
export async function ingestCrmLinkedDocuments(): Promise<{
  startups: number;
  seen: number;
  created: number;
  skipped: number;
  failed: number;
  error: string | null;
}> {
  const stats = { startups: 0, seen: 0, created: 0, skipped: 0, failed: 0, error: null as string | null };
  const [pipeline, portfolio] = await Promise.all([getPipeline(), getPortfolio()]);
  const candidates = await loadIdentityCandidates();
  const byName = new Map(candidates.map((c) => [c.normalized_name, c.id]));

  for (const deal of pipeline) {
    const links = linksFromDeal(deal);
    if (!links.length) continue;
    stats.startups += 1;
    let startupId = byName.get(deal.name.toLowerCase().trim()) || deal.id;
    try {
      const upsert = await upsertFromRaw(
        {
          sourceType: "AIRTABLE",
          sourceName: "Airtable PIPELINE",
          externalId: deal.id,
          sourceUrl: deal.ficheUrl || deal.pitchUrl,
          payload: { name: deal.name, website: deal.websiteUrl, country: deal.country, sector: deal.sector, description: deal.description },
        },
        { candidates },
      );
      startupId = upsert.startupId;
      if (!byName.has(deal.name.toLowerCase().trim())) {
        byName.set(deal.name.toLowerCase().trim(), startupId);
        candidates.push({
          id: startupId,
          name: deal.name,
          website: deal.websiteUrl,
          normalized_domain: null,
          normalized_name: deal.name.toLowerCase(),
        });
      }
    } catch {
      stats.failed += 1;
      continue;
    }

    for (const link of links) {
      stats.seen += 1;
      const external = `crm:${googleFileId(link.href)}`;
      const res = await writeLinkedDoc({
        startup_id: startupId,
        source_type: "GOOGLE_DRIVE",
        external_file_id: external,
        filename: `${deal.name} - ${link.label}`,
        source_url: link.href,
        document_type: link.type,
        content_hash: contentHash([link.href]),
        extraction_status: "SKIPPED",
        processed_at: new Date().toISOString(),
      });
      if (res.ok) stats.created += 1;
      else if (res.status === 409) stats.skipped += 1;
      else {
        stats.failed += 1;
        if (!stats.error) stats.error = `${res.status}: ${res.error}`;
      }
    }
  }

  for (const company of portfolio) {
    const hrefs = [company.ficheUrl, company.dossierUrl].filter(Boolean) as string[];
    if (!hrefs.length) continue;
    const startupId = byName.get(company.name.toLowerCase().trim()) || company.id;
    for (const href of hrefs) {
      stats.seen += 1;
      const res = await writeLinkedDoc({
        startup_id: startupId,
        source_type: "GOOGLE_DRIVE",
        external_file_id: `crm:${googleFileId(href)}`,
        filename: `${company.name} - dossier`,
        source_url: href,
        document_type: "OTHER",
        content_hash: contentHash([href]),
        extraction_status: "SKIPPED",
        processed_at: new Date().toISOString(),
      });
      if (res.ok) stats.created += 1;
      else if (res.status === 409) stats.skipped += 1;
      else {
        stats.failed += 1;
        if (!stats.error) stats.error = `${res.status}: ${res.error}`;
      }
    }
  }

  return stats;
}
