import { AirtableAdapter } from "@/lib/services/airtable-adapter";
import { upsertFromRaw, loadIdentityCandidates } from "@/lib/services/startup-service";
import { finishSyncRun, startSyncRun } from "@/lib/services/sync-runs";
import { recordActivity } from "@/lib/services/activity";
import { logOp } from "@/lib/log";

export type SyncStats = {
  seen: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  flagged: number;
};

export async function syncAirtable(): Promise<SyncStats> {
  const started = Date.now();
  const runId = await startSyncRun("AIRTABLE");
  await recordActivity("system", "SYNC_STARTED", "AIRTABLE");
  const stats: SyncStats = { seen: 0, created: 0, updated: 0, skipped: 0, failed: 0, flagged: 0 };
  try {
    const adapter = new AirtableAdapter();
    const records = await adapter.discover();
    const candidates = await loadIdentityCandidates();
    stats.seen = records.length;
    for (const rec of records) {
      try {
        const result = await upsertFromRaw(rec, { candidates });
        if (result.action === "created") {
          stats.created += 1;
          candidates.push({
            id: result.startupId,
            name: String(rec.payload.name || ""),
            website: (rec.payload.websiteUrl as string | null) ?? null,
            normalized_domain: null,
            normalized_name: String(rec.payload.name || "").toLowerCase(),
          });
        }
        if (result.action === "created") stats.created += 1;
        else if (result.action === "updated") stats.updated += 1;
        else if (result.action === "skipped") stats.skipped += 1;
        else stats.flagged += 1;
      } catch (err) {
        stats.failed += 1;
        logOp({ op: "airtable.record", status: "error", recordId: rec.externalId, error: err instanceof Error ? err.message : "unknown" });
      }
    }
    const status = stats.failed && stats.failed < stats.seen ? "PARTIAL" : stats.failed === stats.seen && stats.seen ? "FAILED" : "COMPLETED";
    await finishSyncRun(runId, {
      status,
      records_seen: stats.seen,
      records_created: stats.created,
      records_updated: stats.updated,
      records_skipped: stats.skipped,
      records_failed: stats.failed,
    });
    await recordActivity("system", status === "FAILED" ? "SYNC_FAILED" : "SYNC_COMPLETED", `AIRTABLE ${JSON.stringify(stats)}`);
    logOp({ op: "airtable.sync", status, duration_ms: Date.now() - started, ...stats });
    return stats;
  } catch (err) {
    await finishSyncRun(runId, { status: "FAILED", error_summary: err instanceof Error ? err.message : "unknown", records_seen: stats.seen, records_failed: stats.failed });
    await recordActivity("system", "SYNC_FAILED", "AIRTABLE");
    throw err;
  }
}
