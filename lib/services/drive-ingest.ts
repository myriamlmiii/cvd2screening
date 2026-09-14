import { z } from "zod";
import { withBackoff } from "@/lib/retry";
import { logOp } from "@/lib/log";
import { serviceAccountAccessToken } from "@/lib/google/service-account";
import { supabaseAdmin } from "@/lib/services/supabase-rest";
import { extractDriveFile } from "@/lib/services/drive-extract";
import { classifyDocument, pickDescriptionText } from "@/lib/services/document-classify";
import { processingPlan } from "@/lib/documents/processing";
import { assignDocumentVersions } from "@/lib/documents/versioning";
import { engagementFactsFromDocs, engagementSignalFromFacts } from "@/lib/documents/engagement";
import { normalizeDocumentType } from "@/lib/documents/categories";
import { upsertFromRaw, loadIdentityCandidates } from "@/lib/services/startup-service";
import { processQueuedScreenings } from "@/lib/services/screening-run";
import { finishSyncRun, startSyncRun } from "@/lib/services/sync-runs";
import { recordActivity } from "@/lib/services/activity";
import { contentHash } from "@/lib/normalize";
import type { StartupDocumentRow, StartupRow } from "@/lib/domain/crm";

const FOLDER = "application/vnd.google-apps.folder";

const fileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  modifiedTime: z.string().optional(),
  md5Checksum: z.string().optional(),
  webViewLink: z.string().optional(),
  size: z.union([z.string(), z.number()]).optional(),
  parents: z.array(z.string()).optional(),
});

type DriveFile = z.infer<typeof fileSchema>;

export function isYearFolderName(name: string): boolean {
  return /^(19|20)\d{2}$/.test(name.trim());
}

/** Comma-separated Drive folder IDs — each a root to walk independently (e.g. one per intake year). */
export function driveFolderIds(): string[] {
  return (process.env.GOOGLE_DRIVE_FOLDER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function fileSize(file: DriveFile): number | null {
  if (file.size == null) return null;
  const n = Number(file.size);
  return Number.isFinite(n) ? n : null;
}

function fileStamp(file: DriveFile): string {
  return file.md5Checksum || file.modifiedTime || contentHash([file.id, file.name]);
}

async function listChildren(token: string, folderId: string): Promise<DriveFile[]> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`);
  url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,md5Checksum,webViewLink,size,parents),nextPageToken");
  url.searchParams.set("pageSize", "1000");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    else url.searchParams.delete("pageToken");
    const res = await withBackoff(() => fetch(url, { headers: { Authorization: `Bearer ${token}` } }));
    if (!res.ok) throw new Error(`Drive list ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { files?: unknown[]; nextPageToken?: string };
    for (const f of json.files ?? []) {
      const parsed = fileSchema.safeParse(f);
      if (parsed.success) files.push(parsed.data);
    }
    pageToken = json.nextPageToken;
  } while (pageToken);
  return files;
}

/** Every file under a startup folder, any depth. Folders are walked, not returned as documents. */
export async function listFilesRecursive(
  token: string,
  folderId: string,
  relative = "",
  seen: Set<string> = new Set(),
): Promise<{ file: DriveFile; relativePath: string; parentId: string }[]> {
  if (seen.has(folderId)) return [];
  seen.add(folderId);
  const out: { file: DriveFile; relativePath: string; parentId: string }[] = [];
  const children = await listChildren(token, folderId);
  for (const child of children) {
    if (child.mimeType === FOLDER) {
      const nested = await listFilesRecursive(token, child.id, `${relative}${child.name}/`, seen);
      out.push(...nested);
    } else {
      out.push({ file: child, relativePath: `${relative}${child.name}`, parentId: folderId });
    }
  }
  return out;
}

async function getFolderName(token: string, id: string): Promise<string | null> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${id}`);
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("supportsAllDrives", "true");
  const res = await withBackoff(() => fetch(url, { headers: { Authorization: `Bearer ${token}` } }));
  if (!res.ok) return null;
  const json = (await res.json()) as { name?: string };
  return json.name ?? null;
}

/**
 * Discovers startup folders under a root. Two shapes are supported:
 *  - root contains year-named subfolders (2024/2025/...), each holding startup folders
 *  - root IS itself a year folder (or has no year structure) — its direct children are startups,
 *    tagged with `fallbackYear` when the root's own Drive name looks like a year (e.g. "2026").
 */
export async function discoverStartupFolders(
  token: string,
  rootId: string,
  fallbackYear: string | null = null,
): Promise<{ year: string | null; folder: DriveFile }[]> {
  const top = await listChildren(token, rootId);
  const years = top.filter((f) => f.mimeType === FOLDER && isYearFolderName(f.name));
  const startups: { year: string | null; folder: DriveFile }[] = [];
  if (years.length) {
    for (const year of years) {
      const kids = await listChildren(token, year.id);
      for (const kid of kids) {
        if (kid.mimeType === FOLDER) startups.push({ year: year.name, folder: kid });
      }
    }
    return startups;
  }
  for (const kid of top) {
    if (kid.mimeType === FOLDER) startups.push({ year: fallbackYear, folder: kid });
  }
  return startups;
}

/** Every startup folder across every configured Drive root, year-tagged from the root's own Drive name when it's a year folder. */
export async function discoverAllStartupFolders(
  token: string,
  rootIds: string[],
): Promise<{ year: string | null; folder: DriveFile }[]> {
  const all: { year: string | null; folder: DriveFile }[] = [];
  for (const rootId of rootIds) {
    const name = await getFolderName(token, rootId);
    const fallbackYear = name && isYearFolderName(name) ? name : null;
    all.push(...(await discoverStartupFolders(token, rootId, fallbackYear)));
  }
  return all;
}

async function existingDocs(startupId: string): Promise<StartupDocumentRow[]> {
  const select =
    "id,startup_id,source_type,external_file_id,filename,mime_type,source_url,extracted_text,content_hash,extraction_status,processed_at,modified_time,byte_size,document_type,classification_source,missing_since,md5_checksum";
  const result = await supabaseAdmin<StartupDocumentRow[]>(
    `startup_documents?startup_id=eq.${encodeURIComponent(startupId)}&select=${select}&limit=2000`,
  );
  if (result.ok) return result.data ?? [];
  const fallback = await supabaseAdmin<StartupDocumentRow[]>(
    `startup_documents?startup_id=eq.${encodeURIComponent(startupId)}&select=id,startup_id,source_type,external_file_id,filename,mime_type,source_url,extracted_text,content_hash,extraction_status,processed_at,modified_time&limit=2000`,
  );
  return fallback.data ?? [];
}

async function upsertDocument(row: Record<string, unknown>) {
  const first = await supabaseAdmin("startup_documents", {
    method: "POST",
    body: JSON.stringify([row]),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  if (first.ok) return;
  const core = {
    startup_id: row.startup_id,
    source_type: row.source_type,
    external_file_id: row.external_file_id,
    filename: row.filename,
    mime_type: row.mime_type,
    source_url: row.source_url,
    extracted_text: row.extracted_text,
    content_hash: row.content_hash,
    extraction_status: row.extraction_status,
    processed_at: row.processed_at,
    modified_time: row.modified_time,
  };
  await supabaseAdmin("startup_documents", {
    method: "POST",
    body: JSON.stringify([core]),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

export async function ingestGoogleDrive(): Promise<{
  seen: number;
  processed: number;
  skipped: number;
  failed: number;
  startups: number;
  created: number;
  updated: number;
  groqClassified: number;
  keywordClassified: number;
  stageChanges: number;
  missingLogged: number;
}> {
  const folderIds = driveFolderIds();
  const stats = {
    seen: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    startups: 0,
    created: 0,
    updated: 0,
    groqClassified: 0,
    keywordClassified: 0,
    stageChanges: 0,
    missingLogged: 0,
  };
  if (!folderIds.length) return stats;
  const token = await serviceAccountAccessToken();
  if (!token) {
    logOp({ op: "drive.ingest", status: "skipped", error: "missing google service account key" });
    return stats;
  }
  const running = await supabaseAdmin<{ started_at: string }[]>(
    "sync_runs?source=eq.GOOGLE_DRIVE&status=eq.RUNNING&select=started_at&order=started_at.desc&limit=1",
  );
  const startedAt = running.data?.[0]?.started_at;
  if (startedAt && Date.now() - new Date(startedAt).getTime() < 15 * 60_000) {
    logOp({ op: "drive.ingest", status: "skipped", error: "sync already running" });
    return stats;
  }
  const runId = await startSyncRun("GOOGLE_DRIVE");
  try {
    const startupFolders = await discoverAllStartupFolders(token, folderIds);
    stats.startups = startupFolders.length;
    const candidates = await loadIdentityCandidates();

    for (const { year, folder } of startupFolders) {
      let startupId: string | null = null;
      try {
        const upsert = await upsertFromRaw(
          {
            sourceType: "GOOGLE_DRIVE",
            sourceName: year ? `Google Drive ${year}` : "Google Drive",
            externalId: `gdrive:folder:${folder.id}`,
            sourceUrl: folder.webViewLink,
            payload: { name: folder.name, dateEntered: year ? `${year}-01-01` : null },
          },
          { candidates },
        );
        startupId = upsert.startupId;
        if (upsert.action === "created") {
          candidates.push({
            id: upsert.startupId,
            name: folder.name,
            website: null,
            normalized_domain: null,
            normalized_name: folder.name.toLowerCase(),
          });
          await supabaseAdmin("processing_jobs", {
            method: "POST",
            body: JSON.stringify([{ type: "ai_screening", startup_id: upsert.startupId, status: "QUEUED" }]),
            prefer: "return=minimal",
          });
        }
      } catch (err) {
        stats.failed += 1;
        logOp({ op: "drive.startup", status: "error", folderId: folder.id, error: err instanceof Error ? err.message : "unknown" });
        continue;
      }

      const prior = await existingDocs(startupId);
      const byFileId = new Map(prior.map((d) => [d.external_file_id, d]));
      const files = await listFilesRecursive(token, folder.id);
      stats.seen += files.length;
      const seenIds = new Set<string>();
      const working: StartupDocumentRow[] = [...prior];

      for (const { file, relativePath, parentId } of files) {
        seenIds.add(file.id);
        const prev = byFileId.get(file.id);
        const stamp = fileStamp(file);
        const unchanged = Boolean(prev && prev.content_hash === stamp && prev.missing_since == null);
        try {
          let classified = await classifyDocument({
            filename: relativePath,
            mimeType: file.mimeType,
            excerpt: null,
            cached: prev?.document_type ?? null,
          });
          const plan = processingPlan(file.mimeType, fileSize(file), classified.category);
          let extractedText = prev?.extracted_text ?? null;
          let extractionStatus = prev?.extraction_status ?? "SKIPPED";
          let processingStatus = plan.status;
          if (!unchanged && !plan.skipExtract) {
            const extracted = await extractDriveFile({
              token,
              id: file.id,
              filename: file.name,
              mimeType: file.mimeType,
              size: fileSize(file),
            });
            extractedText = extracted.text;
            extractionStatus = extracted.status;
            processingStatus = extracted.status === "COMPLETED" ? "EXTRACTED" : extracted.status === "FAILED" ? "FAILED" : "CLASSIFIED";
            if (classified.category === "OTHER" && extractedText) {
              classified = await classifyDocument({
                filename: relativePath,
                mimeType: file.mimeType,
                excerpt: extractedText,
                cached: prev?.document_type ?? null,
              });
            }
          } else if (plan.skipExtract) {
            extractionStatus = "SKIPPED";
            processingStatus = plan.status;
          } else if (unchanged) {
            const prevStatus = (prev as { processing_status?: string } | undefined)?.processing_status;
            if (prevStatus === "AVAILABLE" || prevStatus === "CLASSIFIED" || prevStatus === "EXTRACTED" || prevStatus === "NOT_PROCESSED" || prevStatus === "FAILED") {
              processingStatus = prevStatus;
            }
          }

          if (classified.source === "GROQ") stats.groqClassified += 1;
          if (classified.source === "KEYWORD" || classified.source === "MIME") stats.keywordClassified += 1;

          const nowIso = new Date().toISOString();
          await upsertDocument({
            startup_id: startupId,
            source_type: "GOOGLE_DRIVE",
            external_file_id: file.id,
            filename: relativePath,
            mime_type: file.mimeType,
            source_url: file.webViewLink ?? null,
            extracted_text: extractedText,
            content_hash: stamp,
            extraction_status: extractionStatus,
            processed_at: nowIso,
            modified_time: file.modifiedTime ?? null,
            byte_size: fileSize(file),
            document_type: classified.category,
            document_category: classified.category,
            classification_source: classified.source === "CACHED" ? prev?.classification_source || "CACHED" : classified.source,
            classification_confidence: classified.confidence,
            missing_since: null,
            md5_checksum: file.md5Checksum ?? null,
            drive_file_id: file.id,
            drive_parent_id: file.parents?.[0] || parentId,
            drive_path: relativePath,
            processing_status: processingStatus,
            processing_reason: plan.reason,
            last_seen_at: nowIso,
            extraction_confidence: extractedText ? 0.8 : 0,
          });

          const nextRow = {
            ...(prev ?? ({} as StartupDocumentRow)),
            startup_id: startupId,
            external_file_id: file.id,
            filename: relativePath,
            mime_type: file.mimeType,
            source_url: file.webViewLink ?? null,
            extracted_text: extractedText,
            content_hash: stamp,
            extraction_status: extractionStatus,
            document_type: classified.category,
            modified_time: file.modifiedTime ?? null,
            missing_since: null,
          } as StartupDocumentRow;
          const idx = working.findIndex((d) => d.external_file_id === file.id);
          if (idx >= 0) working[idx] = nextRow;
          else working.push(nextRow);

          if (!prev) {
            stats.created += 1;
            stats.processed += 1;
            await recordActivity(startupId, "DOCUMENT_ADDED", relativePath);
          } else if (!unchanged) {
            stats.updated += 1;
            stats.processed += 1;
          } else {
            stats.skipped += 1;
          }
        } catch (err) {
          stats.failed += 1;
          logOp({ op: "drive.file", status: "error", fileId: file.id, error: err instanceof Error ? err.message : "unknown" });
        }
      }

      const now = new Date().toISOString();
      for (const doc of prior) {
        if (seenIds.has(doc.external_file_id) || doc.missing_since) continue;
        await supabaseAdmin(`startup_documents?id=eq.${encodeURIComponent(doc.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ missing_since: now }),
        });
        stats.missingLogged += 1;
        const idx = working.findIndex((d) => d.external_file_id === doc.external_file_id);
        if (idx >= 0) working[idx] = { ...working[idx], missing_since: now };
      }

      const present = working.filter((d) => !d.missing_since);
      const versioned = assignDocumentVersions(
        startupId,
        present.map((d) => ({
          external_file_id: d.external_file_id,
          filename: d.filename || "",
          document_type: normalizeDocumentType(d.document_type),
          modified_time: d.modified_time,
        })),
      );
      for (const [fileId, meta] of versioned) {
        await supabaseAdmin(`startup_documents?external_file_id=eq.${encodeURIComponent(fileId)}`, {
          method: "PATCH",
          body: JSON.stringify({
            logical_document_group: meta.group,
            document_version: meta.version,
            is_latest: meta.isLatest,
          }),
        });
      }

      const facts = engagementFactsFromDocs(
        present.map((d) => ({
          document_type: normalizeDocumentType(d.document_type),
          filename: d.filename,
          modified_time: d.modified_time,
        })),
      );
      const signal = engagementSignalFromFacts(facts);
      const description = pickDescriptionText(
        present.map((d) => ({ filename: d.filename || "", text: d.extracted_text })),
      );
      const current = await supabaseAdmin<Pick<StartupRow, "description" | "engagement_stage">[]>(
        `startups?id=eq.${encodeURIComponent(startupId)}&select=description,engagement_stage`,
      );
      const row = current.data?.[0];
      const patch: Record<string, unknown> = {
        engagement_stage: signal,
        engagement_signal: signal,
        engagement_facts: facts,
        last_evidence_at: facts.last_document_received_at,
        updated_at: now,
      };
      if (!row?.description && description) patch.description = description;
      if (row?.engagement_stage && row.engagement_stage !== signal) stats.stageChanges += 1;
      else if (!row?.engagement_stage) stats.stageChanges += 1;
      const patched = await supabaseAdmin(`startups?id=eq.${encodeURIComponent(startupId)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!patched.ok) {
        const fallback: Record<string, unknown> = { updated_at: now };
        if (!row?.description && description) fallback.description = description;
        await supabaseAdmin(`startups?id=eq.${encodeURIComponent(startupId)}`, {
          method: "PATCH",
          body: JSON.stringify(fallback),
        });
      }
    }

    const screening = await processQueuedScreenings(5);
    await finishSyncRun(runId, {
      status: stats.failed ? "PARTIAL" : "COMPLETED",
      records_seen: stats.seen,
      records_created: stats.created,
      records_updated: stats.updated,
      records_skipped: stats.skipped,
      records_failed: stats.failed,
      details: {
        startups: stats.startups,
        groq_classified: stats.groqClassified,
        keyword_classified: stats.keywordClassified,
        stage_changes: stats.stageChanges,
        missing_logged: stats.missingLogged,
        screenings_run: screening.ran,
        screenings_failed: screening.failed,
      },
    });
    logOp({ op: "drive.ingest", status: "ok", ...stats });
    return stats;
  } catch (err) {
    await finishSyncRun(runId, { status: "FAILED", error_summary: err instanceof Error ? err.message : "unknown" });
    throw err;
  }
}
