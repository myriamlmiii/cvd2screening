-- U-Investors CVD 2.0 — scored_deals
--
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New
-- query -> paste -> Run) against a fresh Supabase project. It is the
-- dashboard's read model for AI scores: the Python pipeline
-- (backend/src/cvd/supabase_sink.py) upserts into it after every scored
-- run; the Next.js app (lib/supabase.ts) reads it with the anon key and
-- joins it to the real Airtable PIPELINE data by `source_record_id`
-- (Airtable's own record id, e.g. "recXXXXXXXXXXXXXX").
--
-- Airtable stays the system of record for deal data. This table only ever
-- holds derived/computed screening output — nothing here is hand-edited.

create table if not exists scored_deals (
  source_record_id   text primary key,        -- Airtable record id (join key)
  deal_id            text not null,            -- pipeline's own stable id (domain-based)
  name               text not null,
  sector             text,
  geography          text,
  screening_stage    text not null default 'Received',
  gp_decision        text not null default 'Pending',
  qualified          boolean not null default false,
  rejection_reason   text,

  cvd_score          numeric,
  recommendation     text,                     -- "Advance" | "Review" | "Hold" | "Reject"
  assessment         text,
  axes               jsonb not null default '[]'::jsonb,
  strengths          jsonb not null default '[]'::jsonb,
  risks              jsonb not null default '[]'::jsonb,

  deck_summary       jsonb not null default '[]'::jsonb,
  competitors        jsonb not null default '[]'::jsonb,
  fields_verified    integer,
  fields_total       integer,

  scored_at          timestamptz,
  updated_at         timestamptz not null default now()
);

create index if not exists scored_deals_deal_id_idx on scored_deals (deal_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists scored_deals_set_updated_at on scored_deals;
create trigger scored_deals_set_updated_at
  before update on scored_deals
  for each row execute function set_updated_at();

-- RLS: public read-only. Writes only ever come from the backend's service
-- role key, which bypasses RLS entirely — no write policy is needed (or
-- wanted) here.
alter table scored_deals enable row level security;

drop policy if exists "scored_deals read" on scored_deals;
create policy "scored_deals read" on scored_deals
  for select
  to anon, authenticated
  using (true);

-- Optional AI trace columns (safe to re-run).
alter table scored_deals add column if not exists confidence numeric;
alter table scored_deals add column if not exists evidence jsonb not null default '[]'::jsonb;
alter table scored_deals add column if not exists missing_information jsonb not null default '[]'::jsonb;
alter table scored_deals add column if not exists model text;
alter table scored_deals add column if not exists prompt_version text;
alter table scored_deals add column if not exists ai_recommendation text;
alter table scored_deals add column if not exists data_completeness numeric;

-- Immutable human decisions. Never update these rows.
create table if not exists decision_events (
  id uuid primary key default gen_random_uuid(),
  startup_id text not null,
  decision text not null,
  actor text,
  rationale text,
  created_at timestamptz not null default now()
);
create index if not exists decision_events_startup_idx on decision_events (startup_id, created_at desc);
alter table decision_events enable row level security;
drop policy if exists "decision_events read" on decision_events;
create policy "decision_events read" on decision_events
  for select to anon, authenticated using (true);

create table if not exists startup_activity (
  id uuid primary key default gen_random_uuid(),
  startup_id text not null,
  kind text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists startup_activity_startup_idx on startup_activity (startup_id, created_at desc);
alter table startup_activity enable row level security;
drop policy if exists "startup_activity read" on startup_activity;
create policy "startup_activity read" on startup_activity
  for select to anon, authenticated using (true);

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  status text not null,
  detail text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists scored_deals_gp_decision_idx on scored_deals (gp_decision);
create index if not exists scored_deals_recommendation_idx on scored_deals (recommendation);
create index if not exists scored_deals_ai_recommendation_idx on scored_deals (ai_recommendation);
create index if not exists scored_deals_sector_idx on scored_deals (sector);
create index if not exists scored_deals_geography_idx on scored_deals (geography);
create index if not exists scored_deals_updated_at_idx on scored_deals (updated_at desc);
create index if not exists scored_deals_scored_at_idx on scored_deals (scored_at desc);
create index if not exists automation_runs_module_idx on automation_runs (module, started_at desc);

alter table scored_deals add column if not exists screening_hash text;
alter table scored_deals add column if not exists prompt_version text;

create table if not exists processing_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  startup_id text,
  status text not null,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  attempts integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists processing_jobs_status_idx on processing_jobs (status, created_at);
create unique index if not exists processing_jobs_idempotency_idx
  on processing_jobs ((metadata->>'idempotency_key'))
  where metadata ? 'idempotency_key';
alter table processing_jobs enable row level security;
drop policy if exists "processing_jobs read" on processing_jobs;
create policy "processing_jobs read" on processing_jobs
  for select to anon, authenticated using (true);

create table if not exists source_documents (
  file_id text primary key,
  startup_id text,
  source_path text,
  modified_time timestamptz,
  processing_status text not null default 'QUEUED',
  extraction_status text,
  updated_at timestamptz not null default now()
);
create index if not exists source_documents_startup_idx on source_documents (startup_id);
alter table source_documents enable row level security;
drop policy if exists "source_documents read" on source_documents;
create policy "source_documents read" on source_documents
  for select to anon, authenticated using (true);

-- Canonical CRM (startups, sources, documents, sync_runs, screenings, views):
-- run supabase/migrations/20260913_canonical_crm.sql in the same project.


