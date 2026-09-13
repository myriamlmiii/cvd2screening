"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Play, File } from "lucide-react";
import { DOCUMENT_TYPE_LABEL, classifyFromName, normalizeDocumentType, type DocumentType } from "@/lib/documents/categories";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type ListedDocument = {
  label: string;
  href: string;
  documentType?: string | null;
  mimeType?: string | null;
  size?: number | null;
  extractionStatus?: string | null;
  missing?: boolean;
};

const FILTERS: (DocumentType | "All")[] = [
  "All",
  "PITCH_DECK",
  "NDA",
  "SIGNED_NDA",
  "BENCHMARK",
  "TRACTION",
  "CALL_RECORDING",
  "FINANCIALS",
  "QUESTIONNAIRE",
  "OTHER",
];

function resolvedType(doc: ListedDocument): DocumentType {
  if (doc.documentType) return normalizeDocumentType(doc.documentType);
  return classifyFromName(doc.label, doc.mimeType) ?? "OTHER";
}

function DocIcon({ type, className }: { type: DocumentType; className?: string }) {
  if (type === "CALL_RECORDING") return <Play className={className} />;
  if (type === "BENCHMARK" || type === "FINANCIALS") return <FileSpreadsheet className={className} />;
  if (type === "NDA" || type === "SIGNED_NDA" || type === "PITCH_DECK" || type === "TRACTION" || type === "TERM_SHEET") {
    return <FileText className={className} />;
  }
  return <File className={className} />;
}

function formatSize(size?: number | null) {
  if (size == null || !Number.isFinite(size)) return null;
  if (size >= 1024 * 1024 * 1024) return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

export function DocumentList({ documents }: { documents: ListedDocument[] }) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const rows = useMemo(() => {
    return documents.filter((d) => (filter === "All" ? true : resolvedType(d) === filter));
  }, [documents, filter]);

  if (!documents.length) return null;

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">{t("pages.documents")}</div>
        <div className="text-[10px] text-ink-3">{documents.length}</div>
      </div>
      <div className="mb-1.5 flex flex-wrap gap-1">
        {FILTERS.filter((id) => id === "All" || documents.some((d) => resolvedType(d) === id)).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px]",
              filter === id ? "border-line bg-surface-2 font-semibold text-ink" : "border-line text-ink-3 hover:text-ink",
            )}
          >
            {id === "All" ? t("pages.all") : id === "CALL_RECORDING" ? t("pages.callRecording") : DOCUMENT_TYPE_LABEL[id]}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-line rounded border border-line">
        {rows.map((doc) => {
          const type = resolvedType(doc);
          const size = formatSize(doc.size);
          return (
            <li key={`${doc.href}-${doc.label}`}>
              <a
                href={doc.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-surface-2"
              >
                {type === "CALL_RECORDING" ? (
                  <Play className="h-3 w-3 shrink-0 text-[#c4a57a]" />
                ) : (
                  <DocIcon type={type} className="h-3 w-3 shrink-0 text-ink-3" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{doc.label.split("/").pop()}</span>
                <span className="shrink-0 text-[10px] text-ink-3">
                  {type === "CALL_RECORDING" ? t("pages.callRecording") : DOCUMENT_TYPE_LABEL[type]}
                </span>
                {size ? <span className="shrink-0 font-mono text-[10px] text-ink-3">{size}</span> : null}
                {doc.extractionStatus === "SKIPPED" || type === "CALL_RECORDING" ? (
                  <span className="shrink-0 text-[10px] text-ink-3">{t("pages.referenceOnly")}</span>
                ) : null}
                {doc.missing ? <span className="shrink-0 text-[10px] text-warning">{t("pages.missingOnDrive")}</span> : null}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
