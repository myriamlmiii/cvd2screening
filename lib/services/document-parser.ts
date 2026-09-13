export type ExtractedDocument = {
  text: string | null;
  status: "COMPLETED" | "SKIPPED" | "FAILED";
  fields: Record<string, string | null>;
};

export interface DocumentParser {
  mimeTypes: string[];
  parse(input: { filename: string; mimeType: string; bytes: Uint8Array }): Promise<ExtractedDocument>;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export const csvParser: DocumentParser = {
  mimeTypes: ["text/csv", "text/plain", "application/vnd.ms-excel"],
  async parse({ filename, bytes }) {
    const text = decodeUtf8(bytes).slice(0, 20_000);
    const first = text.split(/\r?\n/).slice(0, 8).join(" ");
    return {
      text,
      status: "COMPLETED",
      fields: { name: filename.replace(/\.[^.]+$/, ""), excerpt: first.slice(0, 400) },
    };
  },
};

export const fallbackParser: DocumentParser = {
  mimeTypes: ["*"],
  async parse({ filename }) {
    return { text: null, status: "SKIPPED", fields: { name: filename.replace(/\.[^.]+$/, "") } };
  },
};

export function parserFor(mimeType: string): DocumentParser {
  const mime = mimeType.toLowerCase();
  if (csvParser.mimeTypes.some((m) => mime.includes(m.split("/")[1] || m))) return csvParser;
  if (mime.startsWith("text/")) return csvParser;
  return fallbackParser;
}

export async function extractPdfText(filename: string, bytes: Uint8Array): Promise<ExtractedDocument> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    const text = (Array.isArray(result.text) ? result.text.join("\n") : result.text || "").slice(0, 80_000);
    return { text: text || null, status: text ? "COMPLETED" : "SKIPPED", fields: { name: filename } };
  } catch {
    return { text: null, status: "FAILED", fields: { name: filename } };
  }
}

export async function extractDocxText(filename: string, bytes: Uint8Array): Promise<ExtractedDocument> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    const text = (result.value || "").slice(0, 80_000);
    return { text: text || null, status: text ? "COMPLETED" : "SKIPPED", fields: { name: filename } };
  } catch {
    return { text: null, status: "FAILED", fields: { name: filename } };
  }
}
