import { supabaseAnon } from "@/lib/services/supabase-rest";
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
  return Boolean(
    process.env.GOOGLE_DRIVE_FOLDER_ID &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
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
    ? "Google Drive is not connected. Existing CRM records stay available; new Drive folders will not appear until an admin connects Drive."
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
