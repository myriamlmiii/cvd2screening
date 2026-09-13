import { supabaseAdmin } from "@/lib/services/supabase-rest";
import type { SyncRunRow } from "@/lib/domain/crm";

export async function startSyncRun(source: string): Promise<string | null> {
  const result = await supabaseAdmin<SyncRunRow[]>("sync_runs", {
    method: "POST",
    body: JSON.stringify([{ source, status: "RUNNING" }]),
    prefer: "return=representation",
  });
  return result.data?.[0]?.id ?? null;
}

export async function finishSyncRun(
  id: string | null,
  patch: Partial<Pick<SyncRunRow, "status" | "records_seen" | "records_created" | "records_updated" | "records_skipped" | "records_failed" | "error_summary" | "details">>,
) {
  if (!id) return;
  const body = { ...patch, completed_at: new Date().toISOString() };
  const first = await supabaseAdmin(`sync_runs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body) });
  if (!first.ok && patch.details) {
    const { details: _details, ...rest } = body;
    await supabaseAdmin(`sync_runs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(rest) });
  }
}
