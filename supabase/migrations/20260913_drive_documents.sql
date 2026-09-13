-- Drive document metadata for standing ingest (safe to re-run).

alter table startup_documents add column if not exists byte_size bigint;
alter table startup_documents add column if not exists document_type text;
alter table startup_documents add column if not exists classification_source text;
alter table startup_documents add column if not exists missing_since timestamptz;
alter table startup_documents add column if not exists md5_checksum text;

alter table startup_documents add column if not exists document_category text;
alter table startup_documents add column if not exists processing_status text;
alter table startup_documents add column if not exists processing_reason text;
alter table startup_documents add column if not exists drive_file_id text;
alter table startup_documents add column if not exists drive_parent_id text;
alter table startup_documents add column if not exists drive_path text;
alter table startup_documents add column if not exists logical_document_group text;
alter table startup_documents add column if not exists document_version integer;
alter table startup_documents add column if not exists is_latest boolean;
alter table startup_documents add column if not exists classification_confidence numeric;
alter table startup_documents add column if not exists extraction_confidence numeric;
alter table startup_documents add column if not exists last_seen_at timestamptz;

alter table startups add column if not exists engagement_signal text;
alter table startups add column if not exists engagement_facts jsonb;
alter table startups add column if not exists last_evidence_at timestamptz;

alter table decision_events add column if not exists tags jsonb not null default '[]'::jsonb;
alter table decision_events add column if not exists ai_recommendation text;
