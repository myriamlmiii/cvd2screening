"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FolderOpen, Search } from "lucide-react";
import { DashCard } from "@/components/ui/Dash";
import { TiltCard } from "@/components/ui/TiltCard";
import { useLocale } from "@/lib/i18n";
import type { SlimDeal } from "@/lib/startups/slim";

type ListPayload = { total: number; page: number; pageSize: number; rows: SlimDeal[] };
type DocRow = {
  external_file_id: string;
  filename: string;
  document_type: string | null;
  startup_id: string;
  mime_type: string | null;
};

export function FilesDashboard({
  initialList,
  recentDocs,
}: {
  initialList: ListPayload;
  recentDocs: DocRow[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["files", q],
    queryFn: async () => {
      const p = new URLSearchParams({ q, sort: "name", pageSize: "72", page: "0" });
      const res = await fetch(`/api/startups?${p}`);
      if (!res.ok) throw new Error("Failed to load files.");
      return (await res.json()) as ListPayload;
    },
    initialData: q ? undefined : initialList,
    placeholderData: keepPreviousData,
  });
  const payload = data ?? initialList;
  const names = useMemo(() => new Map(payload.rows.map((r) => [r.id, r.name])), [payload.rows]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-sans text-[14px] font-semibold tracking-tight text-ink md:text-[15px]">{t("pages.filesTitle")}</h1>
          <p className="mt-0.5 max-w-xl text-[10px] text-ink-3">{t("pages.filesHint")}</p>
        </div>
        <label className="flex h-7 w-[220px] items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-[11px]">
          <Search className="h-3 w-3 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("pages.search")} className="w-full bg-transparent outline-none" />
        </label>
      </div>

      <div className="file-wall mb-3">
        {payload.rows.slice(0, 24).map((row) => (
          <button key={row.id} type="button" className="file-wall__folder" onClick={() => router.push(`/review?id=${encodeURIComponent(row.id)}`)}>
            <FolderOpen className="h-4 w-4 text-[#c4a57a]" />
            <span className="min-w-0 truncate text-[11px] font-semibold">{row.name}</span>
            <span className="text-[9px] text-ink-3">{row.sector || "—"}</span>
          </button>
        ))}
      </div>

      <TiltCard>
        <DashCard padded={false}>
          <div className="border-b border-line px-2.5 py-1.5 text-[11px] font-semibold">{t("pages.recentFiles")}</div>
          {!recentDocs.length ? (
            <p className="px-2.5 py-4 text-[11px] text-ink-3">{t("pages.filesHint")}</p>
          ) : (
            <ul>
              {recentDocs.slice(0, 24).map((doc) => (
                <li key={doc.external_file_id}>
                  <a
                    href={`/api/documents/${encodeURIComponent(doc.external_file_id)}/open`}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1 truncate">{doc.filename}</span>
                    <span className="shrink-0 text-[10px] text-ink-3">{names.get(doc.startup_id) || doc.document_type || "—"}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </DashCard>
      </TiltCard>
      <p className="mt-2 text-[10px] text-ink-3">
        {payload.total} {t("pages.startup")}
      </p>
    </div>
  );
}
