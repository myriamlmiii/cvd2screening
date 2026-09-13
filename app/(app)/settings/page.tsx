import { DashCard } from "@/components/ui/Dash";
import { isSupabaseConfigured } from "@/lib/supabase";
import { supabaseAnon } from "@/lib/services/supabase-rest";

export const dynamic = "force-dynamic";

const MODULES = [
  { name: "Application Intake", env: "INTAKE_WEBHOOK_SECRET", note: "n8n → POST /api/webhooks/intake" },
  { name: "Airtable Synchronization", env: "AIRTABLE_TOKEN", note: "Live PIPELINE + POST /api/sync/airtable" },
  { name: "AI Screening", env: "GROQ_API_KEY", note: "Groq — memos and Python screening" },
  { name: "Decision log", env: "SUPABASE_SERVICE_ROLE_KEY", note: "Immutable decision_events" },
  { name: "Google Drive", env: "GOOGLE_DRIVE_FOLDER_ID", note: "Standing ingest · POST /api/sync/drive" },
] as const;

export default async function SettingsPage() {
  const airtable = Boolean(process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY);
  const groq = Boolean(process.env.GROQ_API_KEY);
  const intake = Boolean(process.env.INTAKE_WEBHOOK_SECRET);
  const drive = Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID);
  const supabaseWrites = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_URL);
  const on: Record<string, boolean> = {
    AIRTABLE_TOKEN: airtable,
    GROQ_API_KEY: groq,
    INTAKE_WEBHOOK_SECRET: intake,
    SUPABASE_SERVICE_ROLE_KEY: supabaseWrites,
    GOOGLE_DRIVE_FOLDER_ID: drive,
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
    <div className="text-ink">
      <h1 className="mb-2 font-sans text-[14px] font-semibold md:text-[15px]">Automations</h1>
      <DashCard className="mb-3">
        <div className="text-[12px] font-semibold">Public CRM data</div>
        <p className="mt-1 text-[11px] text-ink-2">
          AUTH_REQUIRED is off. Visitors see the Airtable snapshot (~247 companies) without an admin login. If live Airtable, Drive, or Supabase fail, that snapshot stays. Turning on AUTH_REQUIRED would gate the UI behind a cookie — it is not required to keep deal data on the site.
        </p>
      </DashCard>
      <p className="mb-3 max-w-2xl text-[11px] text-ink-2">
        Orchestration stays in n8n. Scoring, qualification, and decisions stay in this app. Status below is configuration, not a live ping of every vendor.
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {MODULES.map((m) => {
          const active = on[m.env];
          const label = active ? "Active" : "Disabled";
          return (
            <DashCard key={m.name}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[12px] font-semibold">{m.name}</div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">{label}</span>
              </div>
              <p className="mt-1 text-[11px] text-ink-2">{m.note}</p>
            </DashCard>
          );
        })}
      </div>

      <h2 className="mb-2 mt-4 text-[12px] font-semibold">Drive agent log</h2>
      <DashCard padded={false}>
        {!runs.ok || !runs.data?.length ? (
          <p className="px-3 py-4 text-[11px] text-ink-3">No Drive sync runs recorded yet. After OAuth, POST /api/sync/drive or land on /?code=…</p>
        ) : (
          <table className="w-full text-left text-[11px]">
            <thead className="text-[10px] uppercase text-ink-3">
              <tr>
                <th className="px-2.5 py-2">When</th>
                <th className="px-2.5 py-2">Status</th>
                <th className="px-2.5 py-2">Seen</th>
                <th className="px-2.5 py-2">New</th>
                <th className="px-2.5 py-2">Updated</th>
                <th className="px-2.5 py-2">Groq / keyword</th>
                <th className="px-2.5 py-2">Stage Δ</th>
              </tr>
            </thead>
            <tbody>
              {runs.data.map((run) => {
                const details = run.details ?? {};
                return (
                  <tr key={run.id} className="border-t border-line">
                    <td className="px-2.5 py-1.5 font-mono text-[10px]">{run.started_at.replace("T", " ").slice(0, 16)}</td>
                    <td className="px-2.5 py-1.5">{run.status}</td>
                    <td className="px-2.5 py-1.5">{run.records_seen}</td>
                    <td className="px-2.5 py-1.5">{run.records_created}</td>
                    <td className="px-2.5 py-1.5">{run.records_updated}</td>
                    <td className="px-2.5 py-1.5">
                      {String(details.groq_classified ?? "—")} / {String(details.keyword_classified ?? "—")}
                    </td>
                    <td className="px-2.5 py-1.5">{String(details.stage_changes ?? "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DashCard>
      <p className="mt-3 text-[10px] text-ink-3">
        Supabase scores: {isSupabaseConfigured() ? "configured" : "not configured — CRM still reads Airtable"}.
      </p>
    </div>
  );
}
