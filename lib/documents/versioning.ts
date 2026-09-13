import { contentHash } from "@/lib/normalize";
import type { DocumentType } from "@/lib/documents/categories";

const SUFFIX = /[\s._-]*(?:v(?:er(?:sion)?)?\s*\d+|final(?:\s*\d+)?|draft\s*\d+|copie|copy|rev(?:ision)?\s*\d+|\(\d+\))$/i;

export function logicalStem(filename: string): string {
  let base = (filename.split("/").pop() || filename).replace(/\.[a-z0-9]{1,8}$/i, "");
  for (let i = 0; i < 6; i += 1) {
    const next = base.replace(SUFFIX, "").trim();
    if (next === base) break;
    base = next;
  }
  return base.replace(/[\s._-]+/g, " ").trim().toLowerCase() || "document";
}

export function documentGroupId(startupId: string, type: DocumentType, stem: string): string {
  return contentHash([startupId, type, stem]);
}

export type VersionedDoc = {
  external_file_id: string;
  filename: string;
  document_type: DocumentType;
  modified_time?: string | null;
};

export function assignDocumentVersions<T extends VersionedDoc>(startupId: string, docs: T[]) {
  const buckets = new Map<string, T[]>();
  for (const doc of docs) {
    const stem = logicalStem(doc.filename);
    const group = documentGroupId(startupId, doc.document_type, stem);
    const list = buckets.get(group) ?? [];
    list.push(doc);
    buckets.set(group, list);
  }
  const out = new Map<string, { group: string; version: number; isLatest: boolean; versions: number }>();
  for (const [group, list] of buckets) {
    list.sort((a, b) => String(a.modified_time || "").localeCompare(String(b.modified_time || "")));
    list.forEach((doc, i) => {
      out.set(doc.external_file_id, {
        group,
        version: i + 1,
        isLatest: i === list.length - 1,
        versions: list.length,
      });
    });
  }
  return out;
}
