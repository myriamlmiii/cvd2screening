import { parserFor, type ExtractedDocument } from "@/lib/services/document-parser";

export const EXTRACT_MAX_BYTES = 20 * 1024 * 1024;

const GOOGLE_DOC = "application/vnd.google-apps.document";
const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDE = "application/vnd.google-apps.presentation";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function isVideoMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return m.startsWith("video/") || m.includes("google-apps.video");
}

export function isImageMime(mime: string): boolean {
  return mime.toLowerCase().startsWith("image/");
}

export function isGoogleNative(mime: string): boolean {
  return mime.startsWith("application/vnd.google-apps.") && mime !== "application/vnd.google-apps.folder";
}

export function shouldSkipExtraction(mime: string, size?: number | null): boolean {
  if (isVideoMime(mime) || isImageMime(mime)) return true;
  if (typeof size === "number" && size > EXTRACT_MAX_BYTES) return true;
  return false;
}

async function downloadMedia(token: string, id: string): Promise<Uint8Array> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function exportGoogle(token: string, id: string, mime: string): Promise<string> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${id}/export`);
  url.searchParams.set("mimeType", mime);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive export ${res.status}`);
  return res.text();
}

export async function extractDriveFile(input: {
  token: string;
  id: string;
  filename: string;
  mimeType: string;
  size?: number | null;
}): Promise<ExtractedDocument> {
  const mime = input.mimeType;
  if (shouldSkipExtraction(mime, input.size)) {
    return { text: null, status: "SKIPPED", fields: { name: input.filename, reason: "reference-only" } };
  }

  try {
    if (mime === GOOGLE_DOC || mime === GOOGLE_SLIDE) {
      const text = (await exportGoogle(input.token, input.id, "text/plain")).slice(0, 80_000);
      return { text, status: "COMPLETED", fields: { name: input.filename } };
    }
    if (mime === GOOGLE_SHEET) {
      const text = (await exportGoogle(input.token, input.id, "text/csv")).slice(0, 80_000);
      return { text, status: "COMPLETED", fields: { name: input.filename } };
    }
    if (isGoogleNative(mime)) {
      return { text: null, status: "SKIPPED", fields: { name: input.filename, reason: "unsupported-google-type" } };
    }

    const bytes = await downloadMedia(input.token, input.id);
    if (bytes.byteLength > EXTRACT_MAX_BYTES) {
      return { text: null, status: "SKIPPED", fields: { name: input.filename, reason: "oversize" } };
    }

    if (mime === "application/pdf" || input.filename.toLowerCase().endsWith(".pdf")) {
      const { extractPdfText } = await import("@/lib/services/document-parser");
      return extractPdfText(input.filename, bytes);
    }
    if (mime === DOCX || input.filename.toLowerCase().endsWith(".docx")) {
      const { extractDocxText } = await import("@/lib/services/document-parser");
      return extractDocxText(input.filename, bytes);
    }
    if (mime === XLSX || mime === "application/vnd.ms-excel" || /\.xlsx?$/i.test(input.filename)) {
      return { text: null, status: "SKIPPED", fields: { name: input.filename, reason: "xlsx-metadata-only" } };
    }
    return parserFor(mime).parse({ filename: input.filename, mimeType: mime, bytes });
  } catch {
    return { text: null, status: "FAILED", fields: { name: input.filename } };
  }
}
