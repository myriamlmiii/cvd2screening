import { supabaseAnon } from "@/lib/services/supabase-rest";
import { isServiceAccountConfigured } from "@/lib/google/service-account";
import { driveFolderIds } from "@/lib/services/drive-ingest";
import type { SyncRunRow } from "@/lib/domain/crm";

export type DriveConnectorHealth = {
  connected: boolean;
  configured: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastStatus: string | null;
  message: string;
};

function driveConfigured(): boolean {
  return driveFolderIds().length > 0 && isServiceAccountConfigured();
}

export async function getDriveConnectorHealth(): Promise<DriveConnectorHealth> {
  const configured = driveConfigured();
  const last = await supabaseAnon<SyncRunRow[]>(
    "sync_runs?source=eq.GOOGLE_DRIVE&select=status,completed_at,started_at,error_summary,records_seen,records_created&order=started_at.desc&limit=1",
  );
  const run = last.ok ? last.data?.[0] : undefined;
  const lastSuccessAt =
    run && (run.status === "COMPLETED" || run.status === "PARTIAL") ? run.completed_at || run.started_at : null;
  const lastError = run?.status === "FAILED" ? run.error_summary : configured ? null : "Google Drive is not connected for background sync.";
  const connected = configured && (!run || run.status !== "FAILED");
  const when = lastSuccessAt ? new Date(lastSuccessAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : null;
  const message = !configured
    ? "Google Drive is not connected. Set GOOGLE_DRIVE_FOLDER_IDS and GOOGLE_SERVICE_ACCOUNT_KEY, then share each Drive folder with the service account's email."
    : run?.status === "FAILED"
      ? `Google Drive connection requires attention.${when ? ` Last successful sync: ${when}.` : ""} Existing startups remain in the CRM.`
      : when
        ? `Drive last synced ${when}.`
        : "Drive is connected. Waiting for the first successful sync.";
  return {
    connected,
    configured,
    lastSuccessAt,
    lastError,
    lastStatus: run?.status ?? null,
    message,
  };
}
