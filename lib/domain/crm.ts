export type CanonicalCrmStatus =
  | "New"
  | "En Observation"
  | "Screening"
  | "Review"
  | "Shortlisted"
  | "Passed";

export type ScreeningResult =
  | "Strong Match"
  | "Relevant"
  | "Needs Information"
  | "Weak Match"
  | "Out of Scope";

export type StartupSourceType =
  | "DIRECT_APPLICATION"
  | "EMAIL"
  | "REFERRAL"
  | "AIRTABLE"
  | "GOOGLE_DRIVE"
  | "MANUAL_ENTRY"
  | "EXTERNAL_SOURCE";

export type DuplicateConfidence = "high" | "low";

export type RawSourceRecord = {
  sourceType: StartupSourceType;
  sourceName: string;
  externalId: string;
  sourceUrl?: string | null;
  payload: Record<string, unknown>;
  modifiedAt?: string | null;
};

export type NormalizedStartup = {
  name: string;
  normalizedName: string;
  description: string | null;
  website: string | null;
  normalizedDomain: string | null;
  sector: string | null;
  stage: string | null;
  country: string | null;
  founders: string | null;
  fundingRaw: string | null;
  fundingTotal: number | null;
  fundingCurrency: string | null;
  sourceType: StartupSourceType;
  dateReceived: string | null;
  crmStatus: CanonicalCrmStatus;
  contentHash: string;
};

export type StartupRow = {
  id: string;
  name: string;
  normalized_name: string;
  description: string | null;
  website: string | null;
  normalized_domain: string | null;
  sector: string | null;
  subsector: string | null;
  stage: string | null;
  geography: string | null;
  country: string | null;
  city: string | null;
  founders: string | null;
  funding_total: number | null;
  funding_currency: string | null;
  funding_raw: string | null;
  product_description: string | null;
  market_description: string | null;
  competition: string | null;
  source_type: string | null;
  date_received: string | null;
  crm_status: string;
  screening_result: string | null;
  screening_score: number | null;
  screening_confidence: number | null;
  data_completeness: number | null;
  content_hash: string | null;
  possible_duplicate_of: string | null;
  engagement_stage?: string | null;
  created_at: string;
  updated_at: string;
};

export type StartupSourceRow = {
  id: string;
  startup_id: string;
  source_type: string;
  source_name: string | null;
  external_id: string;
  source_url: string | null;
  source_metadata: Record<string, unknown>;
  content_hash: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

export type StartupDocumentRow = {
  id: string;
  startup_id: string | null;
  source_type: string;
  external_file_id: string;
  filename: string | null;
  mime_type: string | null;
  source_url: string | null;
  extracted_text: string | null;
  content_hash: string | null;
  extraction_status: string;
  processed_at: string | null;
  modified_time: string | null;
  byte_size: number | null;
  document_type: string | null;
  classification_source: string | null;
  missing_since: string | null;
  md5_checksum: string | null;
};

export type SyncRunRow = {
  id: string;
  source: string;
  started_at: string;
  completed_at: string | null;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED";
  records_seen: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;
  error_summary: string | null;
  details: Record<string, unknown> | null;
};

export type ActivityKind =
  | "STARTUP_CREATED"
  | "STARTUP_UPDATED"
  | "SOURCE_ADDED"
  | "DOCUMENT_ADDED"
  | "SYNC_STARTED"
  | "SYNC_COMPLETED"
  | "SYNC_FAILED"
  | "SCREENING_STARTED"
  | "SCREENING_COMPLETED"
  | "STATUS_CHANGED"
  | "REVIEW_COMPLETED";

export interface ExternalSourceAdapter {
  id: string;
  discover(): Promise<RawSourceRecord[]>;
  fetch(externalId: string): Promise<RawSourceRecord | null>;
}
