export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type JobType =
  | "airtable_sync"
  | "drive_ingest"
  | "ai_screening"
  | "bulk_enrichment"
  | "intake";

export type ProcessingJob = {
  id: string;
  type: JobType;
  startupId?: string | null;
  status: JobStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
  attempts: number;
  metadata?: Record<string, string | number | boolean | null>;
};
