"use client";

import { useMemo, useState } from "react";
import { FileText, Folder, Search } from "lucide-react";
import { PageHeader, StatCard } from "@/components/erp/ui";
import { useLocale } from "@/lib/i18n";

export type DocRow = {
  external_file_id: string;
  filename: string | null;
  document_type: string | null;
  startup_id: string | null;
  mime_type: string | null;
  openHref?: string | null;
};

export function DocumentsBoard({ rows, names }: { rows: DocRow[]; names: Record<string, string> }) {
  const { t } = useLocale();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [link, setLink] = useState<"all" | "linked" | "unlinked">("all");
  const types = useMemo(
    () => [...new Set(rows.map((r) => r.document_type || r.mime_type).filter(Boolean))] as string[],
    [rows],
  );
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const linked = Boolean(r.startup_id && names[r.startup_id]);
      if (link === "linked" && !linked) return false;
      if (link === "unlinked" && linked) return false;
      if (type !== "all" && (r.document_type || r.mime_type) !== type) return false;
      if (!needle) return true;
      return [r.filename, r.document_type, r.mime_type, r.startup_id && names[r.startup_id]]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, q, names, type, link]);
  const linked = rows.filter((r) => r.startup_id && names[r.startup_id]).length;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title={t("erp.docsTitle")} subtitle={t("erp.docsSubtitle")} />
      <div className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => setLink("all")}>
          <StatCard icon={<FileText className="h-4 w-4" />} value={String(rows.length)} label={t("erp.docsIndexed")} selected={link === "all"} />
        </button>
        <button type="button" onClick={() => setLink("linked")}>
          <StatCard icon={<Folder className="h-4 w-4" />} value={String(linked)} label={t("erp.docsLinked")} selected={link === "linked"} />
        </button>
        <button type="button" onClick={() => setLink("unlinked")}>
          <StatCard icon={<FileText className="h-4 w-4" />} value={String(rows.length - linked)} label={t("erp.docsUnlinked")} selected={link === "unlinked"} iconClass="bg-[#FEF3C7] text-[#D97706]" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[13px]">
          <Search className="h-4 w-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("erp.docsSearch")} className="w-full outline-none" />
        </div>
        <select className="h-9 rounded-lg border border-line px-2 text-[13px]" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">{t("erp.docsTypeAll")}</option>
          {types.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => { setQ(""); setType("all"); setLink("all"); }} className="text-[13px] text-cvd">
          {t("erp.reset")}
        </button>
      </div>
      <section className="erp-card overflow-hidden">
        <table className="erp-table w-full">
          <thead>
            <tr>
              <th>{t("erp.docsFile")}</th>
              <th>{t("erp.docsType")}</th>
              <th>{t("erp.sitStartup")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-3">
                  {rows.length === 0 ? t("erp.docsEmpty") : t("erp.docsNoMatch")}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.external_file_id}>
                  <td className="font-medium text-ink">{r.filename || r.external_file_id}</td>
                  <td>{r.document_type || r.mime_type || "—"}</td>
                  <td>{(r.startup_id && names[r.startup_id]) || t("erp.docsUnlinkedLabel")}</td>
                  <td>
                    <a
                      className="text-[13px] font-medium text-cvd"
                      href={r.openHref || `/api/documents/${encodeURIComponent(r.external_file_id)}/open`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("erp.docsOpen")}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
