import { supabaseAdmin } from "@/lib/services/supabase-rest";
import { logOp } from "@/lib/log";
import type { ActivityKind } from "@/lib/domain/crm";

export async function recordActivity(startupId: string, kind: ActivityKind, detail?: string | null) {
  const result = await supabaseAdmin("startup_activity", {
    method: "POST",
    body: JSON.stringify([{ startup_id: startupId, kind, detail: detail ?? null }]),
    prefer: "return=minimal",
  });
  if (!result.ok && result.status !== 503) {
    logOp({ op: "activity.append", status: "error", startupId, kind, error: result.error });
  }
}
