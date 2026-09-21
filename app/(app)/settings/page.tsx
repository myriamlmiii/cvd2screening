import { isSupabaseConfigured } from "@/lib/supabase";
import { supabaseAnon } from "@/lib/services/supabase-rest";
import { isServiceAccountConfigured } from "@/lib/google/service-account";
import { driveFolderIds } from "@/lib/services/drive-ingest";
import { PageHeader } from "@/components/erp/ui";
import { DriveSyncButton } from "@/components/erp/DriveSyncButton";
import { THESIS, THESIS_VERSION } from "@/lib/thesis";
import { demoEmail } from "@/lib/auth/session";
import { T, ActiveChip } from "@/components/erp/T";

export const dynamic = "force-dynamic";

const MODULES = [
  { nameKey: "erp.setModIntake", env: "INTAKE_WEBHOOK_SECRET", note: "n8n → POST /api/webhooks/intake" },
  { nameKey: "erp.setModAirtable", env: "AIRTABLE_TOKEN", note: "PIPELINE live + POST /api/sync/airtable" },
  { nameKey: "erp.setModAi", env: "GROQ_API_KEY", note: "Groq — mémos et scoring" },
  { nameKey: "erp.setModLog", env: "SUPABASE_SERVICE_ROLE_KEY", note: "decision_log" },
  { nameKey: "erp.setModDrive", env: "GOOGLE_DRIVE_FOLDER_IDS", note: "Ingest · POST /api/sync/drive" },
] as const;

export default async function SettingsPage() {
  const airtable = Boolean(process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY);
  const groq = Boolean(process.env.GROQ_API_KEY);
  const intake = Boolean(process.env.INTAKE_WEBHOOK_SECRET);
  const folderIds = driveFolderIds();
  const drive = folderIds.length > 0 && isServiceAccountConfigured();
  const supabaseWrites = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_URL);
  const on: Record<string, boolean> = {
    AIRTABLE_TOKEN: airtable,
    GROQ_API_KEY: groq,
    INTAKE_WEBHOOK_SECRET: intake,
    SUPABASE_SERVICE_ROLE_KEY: supabaseWrites,
    GOOGLE_DRIVE_FOLDER_IDS: drive,
  };

  const runsFull = await supabaseAnon<
    {
      id: string;
      source: string;
      started_at: string;
      completed_at: string | null;
      status: string;
      records_seen: number;
      records_created: number;
      records_updated: number;
      records_skipped: number;
      records_failed: number;
      details: Record<string, unknown> | null;
      error_summary: string | null;
    }[]
  >("sync_runs?select=id,source,started_at,completed_at,status,records_seen,records_created,records_updated,records_skipped,records_failed,details,error_summary&order=started_at.desc&limit=8");
  const runs =
    runsFull.ok
      ? runsFull
      : await supabaseAnon<
          {
            id: string;
            source: string;
            started_at: string;
            completed_at: string | null;
            status: string;
            records_seen: number;
            records_created: number;
            records_updated: number;
            records_skipped: number;
            records_failed: number;
            details: Record<string, unknown> | null;
            error_summary: string | null;
          }[]
        >("sync_runs?select=id,source,started_at,completed_at,status,records_seen,records_created,records_updated,records_skipped,records_failed,error_summary&order=started_at.desc&limit=8");

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title={<T k="erp.setTitle" />} subtitle={<T k="erp.setSubtitle" />} />
      <div className="erp-card p-4">
        <div className="text-[13px] font-semibold"><T k="erp.setTeam" /></div>
        <p className="mt-1 text-[13px] text-ink-2">
          <T k="erp.setTeamBody" />
        </p>
        <ul className="mt-3 text-[13px]">
          <li>
            <span className="font-semibold">Driss</span> · Managing Director · <T k="erp.setDemoEmail" vars={{ email: demoEmail() }} />
          </li>
        </ul>
      </div>
      <div className="erp-card p-4 space-y-3">
        <div className="text-[13px] font-semibold"><T k="erp.setDrive" /></div>
        <p className="text-[13px] text-ink-2">
          {isServiceAccountConfigured() ? <T k="erp.setDriveOk" /> : <T k="erp.setDriveEmpty" />}
        </p>
        <DriveSyncButton />
      </div>
      <div className="erp-card p-4">
        <div className="text-[13px] font-semibold"><T k="erp.setThesis" vars={{ v: THESIS_VERSION }} /></div>
        <p className="mt-1 text-[13px] text-ink-2"><T k="erp.setSectors" vars={{ list: THESIS.coreSectors.join(", ") }} /></p>
        <p className="text-[13px] text-ink-2"><T k="erp.setGeos" vars={{ list: THESIS.geographyPriority.join(", ") }} /></p>
      </div>
      <div className="erp-card p-4">
        <div className="text-[13px] font-semibold"><T k="erp.setAccess" /></div>
        <p className="mt-1 text-[13px] text-ink-2">
          <T k="erp.setAccessBody" />
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {MODULES.map((m) => {
          const active = on[m.env];
          return (
            <div key={m.nameKey} className="erp-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px] font-semibold"><T k={m.nameKey} /></div>
                <ActiveChip on={Boolean(active)} />
              </div>
              <p className="mt-1 text-[12px] text-ink-3">{m.note}</p>
            </div>
          );
        })}
      </div>

      <section className="erp-card overflow-hidden">
        <div className="px-5 py-4 text-[15px] font-semibold"><T k="erp.setLog" /></div>
        {!runs.ok || !runs.data?.length ? (
          <p className="px-5 py-8 text-center text-[13px] text-ink-3"><T k="erp.setNoRuns" /></p>
        ) : (
          <table className="erp-table w-full">
            <thead>
              <tr>
                <th><T k="erp.setWhen" /></th>
                <th><T k="erp.status" /></th>
                <th><T k="erp.setSeen" /></th>
                <th><T k="erp.setNew" /></th>
                <th><T k="erp.setUpdated" /></th>
                <th><T k="erp.setGroq" /></th>
                <th><T k="erp.setStageDelta" /></th>
              </tr>
            </thead>
            <tbody>
              {runs.data.map((run) => {
                const details = run.details ?? {};
                return (
                  <tr key={run.id}>
                    <td className="font-mono text-[11px]">{run.started_at.replace("T", " ").slice(0, 16)}</td>
                    <td>{run.status}</td>
                    <td>{run.records_seen}</td>
                    <td>{run.records_created}</td>
                    <td>{run.records_updated}</td>
                    <td>
                      {String(details.groq_classified ?? "—")} / {String(details.keyword_classified ?? "—")}
                    </td>
                    <td>{String(details.stage_changes ?? "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <p className="text-[12px] text-ink-3">
        <T k={isSupabaseConfigured() ? "erp.setScoresOn" : "erp.setScoresOff"} />
      </p>
    </div>
  );
}
