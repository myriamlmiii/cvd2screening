-- Canonical CRM (safe to re-run). scored_deals remains the AI score read-model.

create table if not exists startups (
  id text primary key,
  name text not null,
  normalized_name text not null,
  description text,
  website text,
  normalized_domain text,
  sector text,
  subsector text,
  stage text,
  geography text,
  country text,
  city text,
  founders text,
  funding_total numeric,
  funding_currency text,
  funding_raw text,
  product_description text,
  market_description text,
  competition text,
  source_type text,
  date_received date,
  crm_status text not null default 'New',
  screening_result text,
  screening_score numeric,
  screening_confidence numeric,
  data_completeness numeric,
  content_hash text,
  possible_duplicate_of text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists startups_normalized_name_idx on startups (normalized_name);
create index if not exists startups_normalized_domain_idx on startups (normalized_domain);
create index if not exists startups_crm_status_idx on startups (crm_status);
create index if not exists startups_screening_result_idx on startups (screening_result);
create index if not exists startups_screening_score_idx on startups (screening_score);
create index if not exists startups_sector_idx on startups (sector);
create index if not exists startups_country_idx on startups (country);
create index if not exists startups_stage_idx on startups (stage);
create index if not exists startups_source_type_idx on startups (source_type);
create index if not exists startups_date_received_idx on startups (date_received);
create index if not exists startups_updated_at_idx on startups (updated_at desc);

alter table startups add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(sector,'') || ' ' || coalesce(founders,'') || ' ' || coalesce(website,''))
  ) stored;
create index if not exists startups_search_tsv_idx on startups using gin (search_tsv);

alter table startups enable row level security;
drop policy if exists "startups read" on startups;
create policy "startups read" on startups for select to anon, authenticated using (true);

create table if not exists startup_sources (
  id uuid primary key default gen_random_uuid(),
  startup_id text not null references startups(id) on delete cascade,
  source_type text not null,
  source_name text,
  external_id text not null,
  source_url text,
  source_metadata jsonb not null default '{}'::jsonb,
  content_hash text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, external_id)
);
create index if not exists startup_sources_startup_idx on startup_sources (startup_id);
alter table startup_sources enable row level security;
drop policy if exists "startup_sources read" on startup_sources;
create policy "startup_sources read" on startup_sources for select to anon, authenticated using (true);

create table if not exists startup_documents (
  id uuid primary key default gen_random_uuid(),
  startup_id text,
  source_type text not null default 'GOOGLE_DRIVE',
  external_file_id text not null unique,
  filename text,
  mime_type text,
  source_url text,
  extracted_text text,
  content_hash text,
  extraction_status text not null default 'QUEUED',
  processed_at timestamptz,
  modified_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists startup_documents_startup_idx on startup_documents (startup_id);
create index if not exists startup_documents_hash_idx on startup_documents (content_hash);
alter table startup_documents enable row level security;
drop policy if exists "startup_documents read" on startup_documents;
create policy "startup_documents read" on startup_documents for select to anon, authenticated using (true);

create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'QUEUED',
  records_seen integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  records_failed integer not null default 0,
  error_summary text
);
create index if not exists sync_runs_source_idx on sync_runs (source, started_at desc);
alter table sync_runs enable row level security;
drop policy if exists "sync_runs read" on sync_runs;
create policy "sync_runs read" on sync_runs for select to anon, authenticated using (true);

create table if not exists startup_screenings (
  id uuid primary key default gen_random_uuid(),
  startup_id text not null,
  model text,
  prompt_version text,
  input_hash text,
  overall_score numeric,
  thesis_score numeric,
  product_score numeric,
  traction_score numeric,
  market_score numeric,
  competition_score numeric,
  result text,
  confidence numeric,
  summary text,
  evidence jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  status text not null default 'COMPLETED',
  error text,
  created_at timestamptz not null default now()
);
create index if not exists startup_screenings_startup_idx on startup_screenings (startup_id, created_at desc);
create unique index if not exists startup_screenings_dedupe_idx on startup_screenings (startup_id, input_hash, prompt_version, model)
  where status = 'COMPLETED' and input_hash is not null;
alter table startup_screenings enable row level security;
drop policy if exists "startup_screenings read" on startup_screenings;
create policy "startup_screenings read" on startup_screenings for select to anon, authenticated using (true);

create or replace view crm_pipeline_summary as
select
  count(*)::int as total,
  count(*) filter (where crm_status in ('New', 'En Observation', 'Screening', 'Review', 'Reviewing'))::int as awaiting,
  count(*) filter (where screening_result in ('Strong Match', 'Strong Fit'))::int as strong_fits,
  count(*) filter (where date_trunc('month', coalesce(date_received, created_at)) = date_trunc('month', now()))::int as new_this_month
from startups;

create or replace view crm_sector_distribution as
select coalesce(nullif(sector, ''), '—') as label, count(*)::int as count
from startups
group by 1
order by 2 desc;

create or replace view crm_status_distribution as
select crm_status as label, count(*)::int as count
from startups
group by 1;

create or replace view crm_monthly_volume as
select to_char(date_trunc('month', coalesce(date_received, created_at)), 'YYYY-MM') as month,
       count(*)::int as n
from startups
group by 1
order by 1;

alter table automation_runs enable row level security;
drop policy if exists "automation_runs read" on automation_runs;
create policy "automation_runs read" on automation_runs for select to anon, authenticated using (true);
