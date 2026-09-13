import { supabaseAdmin } from "@/lib/services/supabase-rest";
import { dataCompleteness } from "@/lib/data-quality";
import { recordActivity } from "@/lib/services/activity";
import { resolveIdentity } from "@/lib/services/identity";
import { normalizeRawRecord } from "@/lib/services/normalize-service";
import type { NormalizedStartup, RawSourceRecord, StartupRow, StartupSourceRow } from "@/lib/domain/crm";
import { logOp } from "@/lib/log";

export type UpsertResult = {
  action: "created" | "updated" | "skipped" | "flagged_duplicate";
  startupId: string;
};

async function sourceByExternal(sourceType: string, externalId: string) {
  const q = `startup_sources?source_type=eq.${encodeURIComponent(sourceType)}&external_id=eq.${encodeURIComponent(externalId)}&select=startup_id,content_hash`;
  const result = await supabaseAdmin<Pick<StartupSourceRow, "startup_id" | "content_hash">[]>(q);
  return result.data?.[0] ?? null;
}

export async function loadIdentityCandidates() {
  const result = await supabaseAdmin<Pick<StartupRow, "id" | "name" | "website" | "normalized_domain" | "normalized_name">[]>(
    "startups?select=id,name,website,normalized_domain,normalized_name&limit=5000",
  );
  return result.data ?? [];
}

function rowFromNormalized(id: string, n: NormalizedStartup): Record<string, unknown> {
  const completeness = dataCompleteness({
    name: n.name,
    website: n.website,
    description: n.description,
    sector: n.sector,
    stage: n.stage,
    country: n.country,
    founders: n.founders,
    funding: n.fundingRaw,
  });
  const body: Record<string, unknown> = {
    id,
    name: n.name,
    normalized_name: n.normalizedName,
    website: n.website,
    normalized_domain: n.normalizedDomain,
    sector: n.sector,
    stage: n.stage,
    country: n.country,
    geography: n.country,
    founders: n.founders,
    funding_total: n.fundingTotal,
    funding_currency: n.fundingCurrency,
    funding_raw: n.fundingRaw,
    source_type: n.sourceType,
    date_received: n.dateReceived,
    crm_status: n.crmStatus,
    data_completeness: completeness.pct,
    content_hash: n.contentHash,
  };
  if (n.description != null) body.description = n.description;
  return body;
}

async function attachSource(startupId: string, raw: RawSourceRecord, hash: string) {
  await supabaseAdmin("startup_sources", {
    method: "POST",
    body: JSON.stringify([
      {
        startup_id: startupId,
        source_type: raw.sourceType,
        source_name: raw.sourceName,
        external_id: raw.externalId,
        source_url: raw.sourceUrl ?? null,
        source_metadata: { keys: Object.keys(raw.payload).slice(0, 40) },
        content_hash: hash,
        last_seen_at: new Date().toISOString(),
      },
    ]),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

export async function upsertFromRaw(
  raw: RawSourceRecord,
  opts?: { candidates?: Pick<StartupRow, "id" | "name" | "website" | "normalized_domain" | "normalized_name">[] },
): Promise<UpsertResult> {
  const normalized = normalizeRawRecord(raw);
  const existingSource = await sourceByExternal(raw.sourceType, raw.externalId);
  if (existingSource?.content_hash && existingSource.content_hash === normalized.contentHash) {
    return { action: "skipped", startupId: existingSource.startup_id };
  }

  const candidates = opts?.candidates ?? (await loadIdentityCandidates());
  const identity = resolveIdentity({
    sourceType: raw.sourceType,
    externalId: raw.externalId,
    existingByExternalId: existingSource?.startup_id,
    candidates,
    incoming: normalized,
  });

  if (identity && identity.confidence === "low") {
    const id = raw.externalId;
    const body = { ...rowFromNormalized(id, normalized), possible_duplicate_of: identity.startupId };
    await supabaseAdmin("startups", {
      method: "POST",
      body: JSON.stringify([body]),
      prefer: "resolution=merge-duplicates,return=minimal",
    });
    await attachSource(id, raw, normalized.contentHash);
    await recordActivity(id, "STARTUP_CREATED", `possible duplicate of ${identity.startupId}`);
    return { action: "flagged_duplicate", startupId: id };
  }

  const startupId = identity?.startupId || raw.externalId;
  const created = !identity;
  await supabaseAdmin("startups", {
    method: "POST",
    body: JSON.stringify([rowFromNormalized(startupId, normalized)]),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  await attachSource(startupId, raw, normalized.contentHash);
  await recordActivity(startupId, created ? "STARTUP_CREATED" : "STARTUP_UPDATED", `${raw.sourceType}:${raw.externalId}`);
  logOp({ op: "startup.upsert", startupId, source: raw.sourceType, status: created ? "created" : "updated" });
  return { action: created ? "created" : "updated", startupId };
}
