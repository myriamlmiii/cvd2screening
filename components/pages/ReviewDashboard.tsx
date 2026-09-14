"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { HumanReview } from "@/components/review/HumanReview";
import { DecisionHistory } from "@/components/review/DecisionHistory";
import { RecommendationPanel } from "@/components/recommend/RecommendationPanel";
import { DocumentList } from "@/components/documents/DocumentList";
import { qualificationFor } from "@/lib/qualification/signal";
import { suggestedHumanDecision } from "@/lib/screening/suggest";
import { evidenceIsStale } from "@/lib/documents/engagement";
import { engagementSignalFromFacts, engagementFactsFromDocs } from "@/lib/documents/engagement";
import { classifyFromName, normalizeDocumentType } from "@/lib/documents/categories";
import { Plus, Search } from "lucide-react";
import { ScoreRadar } from "@/components/charts/ScoreRadar";
import { DashCard, DealAvatar, SelectFilter } from "@/components/ui/Dash";
import { Button } from "@/components/ui/Button";
import { statusBadgeClass } from "@/lib/airtable";
import { radarAxes, risks, scoreLabel, strengths, summary, toScoreAxes } from "@/lib/deal-view";
import { postDecisions } from "@/lib/decisions";
import { aiRecommendation, completenessBand, completenessPct, crmStatus, attentionReasons, sourceDocuments, sourceType } from "@/lib/crm";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { analysisStaleLabel } from "@/lib/startups/stale";
import type { SlimDeal } from "@/lib/startups/slim";
import type { ScoredDeal } from "@/types";

const TABS = ["ai", "axes", "flags", "history"] as const;
type Tab = (typeof TABS)[number];
type View = "review" | "list";
const DOT = ["#c4a57a", "#8b7cc8", "#5aa8a4", "#6a849c", "#5d9a7a"];

export type StartupListPayload = {
  total: number;
  page: number;
  pageSize: number;
  facets: { statuses: { label: string; count: number }[]; sectors: { label: string; count: number }[] };
  rows: SlimDeal[];
};

export function ReviewDashboard({
  initialList,
  initialSelected,
  initialStatus = "all",
  initialSector = "all",
  initialId = "",
  queueOnly = false,
  initialRec = "all",
  initialQ = "",
}: {
  initialList: StartupListPayload;
  initialSelected: ScoredDeal | null;
  initialStatus?: string;
  initialSector?: string;
  initialId?: string;
  queueOnly?: boolean;
  initialRec?: string;
  initialQ?: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>(queueOnly ? "review" : "list");
  const [tab, setTab] = useState<Tab>("axes");
  const [q, setQ] = useState(initialQ);
  const deferredQ = useDeferredValue(q);
  const [status, setStatus] = useState(initialStatus);
  const [sector, setSector] = useState(initialSector);
  const [rec, setRec] = useState(initialRec);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(initialId || initialSelected?.id || initialList.rows[0]?.id || "");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");

  useEffect(() => {
    if (initialId) setSelectedId(initialId);
  }, [initialId]);

  useEffect(() => {
    if (!selectedId || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("id", selectedId);
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
  }, [selectedId]);

  const listQuery = useQuery({
    queryKey: ["startups", deferredQ, status, sector, rec, queueOnly, page],
    queryFn: async () => {
      const p = new URLSearchParams({
        q: deferredQ,
        status,
        sector,
        rec,
        queue: queueOnly ? "1" : "0",
        page: String(page),
        pageSize: "40",
        sort: "score",
      });
      const res = await fetch(`/api/startups?${p}`);
      if (!res.ok) throw new Error("Failed to load startups.");
      return (await res.json()) as StartupListPayload;
    },
    initialData: page === 0 && !deferredQ && status === initialStatus && sector === initialSector && rec === initialRec ? initialList : undefined,
    placeholderData: keepPreviousData,
  });

  const list = listQuery.data ?? initialList;
  const statuses = list.facets.statuses;
  const sectors = list.facets.sectors;
  const filtered = list.rows;

  const detailQuery = useQuery({
    queryKey: ["startup", selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${encodeURIComponent(selectedId)}`);
      if (!res.ok) throw new Error("Startup not found.");
      return (await res.json()) as ScoredDeal;
    },
    enabled: Boolean(selectedId),
    initialData: selectedId && initialSelected?.id === selectedId ? initialSelected : undefined,
  });

  const selected = detailQuery.data ?? (initialSelected?.id === selectedId ? initialSelected : null);
  const compare = filtered.slice(0, 8);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const idx = filtered.findIndex((d) => d.id === selectedId);
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        const next = filtered[Math.min(filtered.length - 1, Math.max(0, idx + 1))];
        if (next) setSelectedId(next.id);
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const prev = filtered[Math.max(0, idx <= 0 ? 0 : idx - 1)];
        if (prev) setSelectedId(prev.id);
      }
      if (e.key === "Enter" && selectedId) setView("review");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, selectedId]);

  const decide = async (id: string, gpDecision: "Invest" | "Watch" | "Pass", extra?: { rationale?: string; tags?: string[] }) => {
    const rationaleText = extra?.rationale?.trim() || rationale.trim();
    if (rationaleText.length < 3) {
      setNotice(t("pages.primaryReason"));
      return;
    }
    setBusyId(id);
    setNotice(null);
    const gpMap = { Invest: "Advance", Watch: "Hold", Pass: "Pass" } as const;
    queryClient.setQueryData<ScoredDeal>(["startup", id], (cur) =>
      cur ? { ...cur, score: cur.score ? { ...cur.score, gpDecision: gpMap[gpDecision] } : cur.score } : cur,
    );
    const { previous, error } = await postDecisions([
      { id, gpDecision, rationale: rationaleText, tags: extra?.tags, aiRecommendation: aiRecommendation(selected && selected.id === id ? selected : ({} as ScoredDeal)) },
    ]);
    setBusyId(null);
    if (error) {
      setNotice(error);
      await queryClient.invalidateQueries({ queryKey: ["startup", id] });
    } else if (previous) {
      setRationale("");
      await queryClient.invalidateQueries({ queryKey: ["startups"] });
      await queryClient.invalidateQueries({ queryKey: ["startup", id] });
      await queryClient.invalidateQueries({ queryKey: ["decisions", id] });
      router.refresh();
    }
  };

  if (!list.total && !filtered.length) return <p className="font-semibold text-ink">No Airtable companies.</p>;

  const tabLabel: Record<Tab, string> = {
    ai: t("pages.tabAi"),
    axes: t("pages.tabAxes"),
    flags: t("pages.tabFlags"),
    history: t("pages.tabHistory"),
  };

  return (
    <div className="text-ink">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-sans text-[14px] font-semibold md:text-[15px]">{t("pages.reviewTitle")}</h1>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-md border border-line bg-surface p-0.5 text-[10.5px]">
            {(["review", "list"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={cn("rounded px-2 py-0.5 font-semibold", view === id ? "bg-surface-2 text-ink" : "text-ink-3")}
              >
                {id === "review" ? t("pages.reviewView") : t("pages.list")}
              </button>
            ))}
          </div>
          <Button type="button" size="xs" onClick={() => window.dispatchEvent(new Event("cvd:open-palette"))}>
            <Plus className="h-3 w-3" />
            {t("pages.newStartup")}
          </Button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <label className="flex h-7 min-w-[180px] flex-1 items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-[11px] text-ink">
          <Search className="h-3 w-3 shrink-0 text-ink-3" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder={t("pages.search")}
            aria-label={t("pages.search")}
            className="w-full bg-transparent text-ink outline-none placeholder:text-ink-3"
          />
        </label>
        <SelectFilter
          label={t("pages.status")}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
          options={[{ value: "all", label: t("pages.all") }, ...statuses.map((s) => ({ value: s.label, label: s.label }))]}
        />
        <SelectFilter
          label={t("pages.sector")}
          value={sector}
          onChange={(v) => {
            setSector(v);
            setPage(0);
          }}
          options={[{ value: "all", label: t("pages.all") }, ...sectors.slice(0, 30).map((s) => ({ value: s.label, label: s.label }))]}
        />
        <SelectFilter
          label={t("pages.aiRec")}
          value={rec}
          onChange={(v) => {
            setRec(v);
            setPage(0);
          }}
          options={[
            { value: "all", label: t("pages.all") },
            { value: "Strong Fit", label: "Strong Fit" },
            { value: "Review", label: "Review" },
            { value: "Needs Information", label: "Needs Information" },
            { value: "Watch", label: "Watch" },
            { value: "Lower Priority", label: "Lower Priority" },
          ]}
        />
        {notice ? <span className="text-[10px] font-medium text-critical">{notice}</span> : null}
        <span className="ml-auto text-[10px] font-medium text-ink">
          {t("pages.showingOf")} {filtered.length} / {list.total}
        </span>
      </div>

      {filtered.length === 0 ? (
        <DashCard>
          <p className="text-[12px] font-medium text-ink">{t("pages.noMatch")}</p>
        </DashCard>
      ) : view === "list" ? (
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <DashCard padded={false} className="max-h-[calc(100vh-120px)] overflow-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-surface text-[10px] font-semibold text-ink">
                <tr>
                  <th className="px-2.5 py-1.5">{t("pages.startup")}</th>
                  <th className="px-2.5 py-1.5">{t("pages.sector")}</th>
                  <th className="px-2.5 py-1.5">{t("screening.country")}</th>
                  <th className="px-2.5 py-1.5">{t("pages.status")}</th>
                  <th className="px-2.5 py-1.5">{t("pages.funding")}</th>
                  <th className="px-2.5 py-1.5 text-right">{t("pages.score")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((deal, i) => (
                  <tr
                    key={deal.id}
                    onClick={() => setSelectedId(deal.id)}
                    onDoubleClick={() => {
                      setSelectedId(deal.id);
                      setView("review");
                    }}
                    onMouseEnter={() => {
                      queryClient.prefetchQuery({
                        queryKey: ["startup", deal.id],
                        queryFn: async () => {
                          const res = await fetch(`/api/startups/${encodeURIComponent(deal.id)}`);
                          if (!res.ok) throw new Error("Startup not found.");
                          return (await res.json()) as ScoredDeal;
                        },
                      });
                    }}
                    className={cn("cursor-pointer border-t border-line", deal.id === selected?.id ? "bg-surface-2" : "hover:bg-surface-2/60")}
                  >
                    <td className="px-2.5 py-1.5 font-semibold">
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: DOT[i % DOT.length] }} />
                      {deal.name}
                    </td>
                    <td className="px-2.5 py-1.5">{deal.sector || "—"}</td>
                    <td className="px-2.5 py-1.5">{deal.country || "—"}</td>
                    <td className="px-2.5 py-1.5">
                      <StatusPill status={deal.status} />
                    </td>
                    <td className="max-w-[140px] truncate px-2.5 py-1.5">{deal.fundingSought || "—"}</td>
                    <td className="px-2.5 py-1.5 text-right font-mono font-semibold">{scoreLabel(deal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashCard>
          {selected ? (
            <Dossier
              deal={selected}
              tab={tab}
              setTab={setTab}
              tabLabel={tabLabel}
              t={t}
              compare={compare}
              onSelect={setSelectedId}
              busyId={busyId}
              onDecide={decide}
            />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-2 xl:grid-cols-[240px_minmax(0,1fr)]">
          <DashCard padded={false} className="max-h-[calc(100vh-120px)] overflow-auto">
            <div className="sticky top-0 border-b border-line bg-surface px-2.5 py-1.5 text-[11px] font-semibold">
              {t("pages.list")} · {filtered.length}
            </div>
            <ul>
              {filtered.map((deal) => {
                const on = deal.id === selected?.id;
                return (
                  <li key={deal.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(deal.id)}
                      className={cn("flex w-full items-center gap-2 border-b border-line px-2.5 py-1.5 text-left", on && "bg-surface-2")}
                    >
                      <DealAvatar name={deal.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold">{deal.name}</div>
                        <div className="truncate text-[10px] text-ink-2">{deal.sector || "—"} · {deal.country || "—"}</div>
                      </div>
                      <span className="font-mono text-[10px] font-semibold">{scoreLabel(deal)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </DashCard>
          {selected ? (
            <Dossier
              deal={selected}
              tab={tab}
              setTab={setTab}
              tabLabel={tabLabel}
              t={t}
              compare={compare}
              onSelect={setSelectedId}
              busyId={busyId}
              onDecide={decide}
            />
          ) : null}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-[10px] text-ink-3">
        <span>
          Show {list.page * list.pageSize + 1}–{Math.min((list.page + 1) * list.pageSize, list.total)} of {list.total}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded border border-line px-1.5" onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous page">
            ‹
          </button>
          <span>{list.page + 1}</span>
          <button
            type="button"
            className="rounded border border-line px-1.5"
            onClick={() => setPage((p) => Math.min(Math.max(0, Math.ceil(list.total / list.pageSize) - 1), p + 1))}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span className="text-ink-3">—</span>;
  return <span className={cn("inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold", statusBadgeClass(status))}>{status}</span>;
}

function Dossier({
  deal,
  tab,
  setTab,
  tabLabel,
  t,
  compare,
  onSelect,
  busyId,
  onDecide,
}: {
  deal: ScoredDeal;
  tab: Tab;
  setTab: (t: Tab) => void;
  tabLabel: Record<Tab, string>;
  t: (key: string) => string;
  compare: SlimDeal[];
  onSelect: (id: string) => void;
  busyId: string | null;
  onDecide: (id: string, gp: "Invest" | "Watch" | "Pass", extra?: { rationale?: string; tags?: string[] }) => void;
}) {
  const axes = radarAxes(deal);
  const detail = toScoreAxes(deal);
  const docs = sourceDocuments(deal);
  const why = attentionReasons(deal);
  const facts = engagementFactsFromDocs(
    docs.map((d) => ({ document_type: classifyFromName(d.label, d.mimeType) ?? normalizeDocumentType(d.documentType), filename: d.label })),
  );
  const stage = deal.engagementStage || engagementSignalFromFacts(facts);
  const qualification = qualificationFor(deal);
  const stale = evidenceIsStale(facts.last_document_received_at);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <DashCard>
        <div className="flex items-start gap-2">
          <DealAvatar name={deal.name} className="h-8 w-8 text-[13px]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">{deal.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="rounded border border-line px-1.5 py-0.5 font-semibold">{t("pages.crmStatus")}: {crmStatus(deal)}</span>
              <span className="rounded border border-line px-1.5 py-0.5 font-semibold">{t("pages.qualification")}: {qualification.label}</span>
              <span className="rounded border border-line px-1.5 py-0.5 font-semibold">{t("pages.engagement")}: {stale ? "Stale" : stage}</span>
              <span>{deal.sector || "—"}</span>
              <span>·</span>
              <span>{deal.country || "—"}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[18px] font-semibold leading-none text-[#c4a57a]">{scoreLabel(deal)}</div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-3">{t("pages.score")}</div>
          </div>
        </div>

        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px] md:grid-cols-4">
          <Fact label={t("pages.founder")} value={deal.founder} />
          <Fact label={t("pages.funding")} value={deal.fundingSought} />
          <Fact label={t("pages.website")} href={deal.websiteUrl} value={deal.websiteUrl} />
          <Fact label={t("pages.source")} value={`${sourceType(deal)}${deal.source ? ` · ${deal.source}` : ""}`} />
          <Fact label={t("pages.completeness")} value={`${completenessBand(deal)} (${completenessPct(deal)}%)`} />
          <Fact
            label={t("pages.lastEvidence")}
            value={facts.last_document_received_at ? facts.last_document_received_at.slice(0, 10) : `${facts.document_count} docs`}
          />
        </dl>

        {docs.length > 0 && <DocumentList documents={docs} />}

        {why.length > 0 && (
          <p className="mt-2 text-[10px] text-ink-2">
            {t("pages.whyHere")}: {why.join("; ")}
          </p>
        )}

        {analysisStaleLabel(deal) ? <p className="mt-2 text-[10px] font-medium text-ink-2">{analysisStaleLabel(deal)}</p> : null}

        <HumanReview
          key={deal.id}
          busy={busyId === deal.id}
          aiSuggests={suggestedHumanDecision(aiRecommendation(deal))}
          onConfirm={({ decision, rationale, tags }) => onDecide(deal.id, decision, { rationale, tags })}
        />
      </DashCard>

      <DashCard>
        <div className="flex flex-wrap gap-0.5 border-b border-line pb-1.5">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn("rounded px-2 py-0.5 text-[10.5px] font-semibold", tab === id ? "bg-surface-2 text-ink" : "text-ink-3")}
            >
              {tabLabel[id]}
            </button>
          ))}
        </div>

        {tab === "ai" && (
          <div className="mt-2.5 space-y-2 text-[12px] leading-relaxed">
            <p>{deal.score?.assessment || summary(deal)}</p>
            {!deal.score?.cvdScore ? <p className="text-[11px] font-medium text-ink-2">{t("pages.noAi")}</p> : null}
            {deal.score?.evidence?.length ? (
              <div>
                <div className="text-[10px] font-semibold">Evidence</div>
                <ul className="mt-1 list-disc pl-4 text-[11px]">{deal.score.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
            ) : null}
            {deal.score?.missingInformation?.length ? (
              <div>
                <div className="text-[10px] font-semibold">Missing information</div>
                <ul className="mt-1 list-disc pl-4 text-[11px]">{deal.score.missingInformation.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
            ) : null}
            <RecommendationPanel deal={deal} embedded />
          </div>
        )}

        {tab === "axes" && (
          <div className="mt-2 grid items-start gap-2 lg:grid-cols-[1fr_minmax(180px,1fr)]">
            <ScoreRadar axes={axes} size={140} />
            <ul className="space-y-2 text-[11px]">
              {detail.map((a) => (
                <li key={a.key} className="border-b border-line pb-1.5">
                  <div className="flex justify-between font-semibold">
                    <span>{a.key}</span>
                    <span className="font-mono">{deal.score?.axes?.length ? a.score.toFixed(1) : "—"}</span>
                  </div>
                  {a.rationale ? <p className="mt-0.5 text-ink-2">{a.rationale}</p> : null}
                  {a.evidence ? <p className="mt-0.5">Evidence: {a.evidence}</p> : null}
                  {a.risk ? <p className="mt-0.5">Risk: {a.risk}</p> : null}
                  {a.missing?.length ? <p className="mt-0.5">Missing: {a.missing.join("; ")}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "flags" && (
          <div className="mt-2.5 grid gap-3 text-[11px] font-medium md:grid-cols-2">
            <div>
              <div className="mb-1 font-semibold">{t("pages.strengths")}</div>
              <ul className="space-y-1">{strengths(deal).map((s) => <li key={s}>• {s}</li>)}</ul>
            </div>
            <div>
              <div className="mb-1 font-semibold">{t("pages.risks")}</div>
              <ul className="space-y-1">{risks(deal).map((s) => <li key={s}>• {s}</li>)}</ul>
            </div>
          </div>
        )}

        {tab === "history" && <DecisionHistory startupId={deal.id} note={deal.update} />}
      </DashCard>

      <DashCard padded={false}>
        <div className="border-b border-line px-2.5 py-1.5 text-[11px] font-semibold">{t("pages.historical")}</div>
        <div className="grid gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_140px]">
          <table className="w-full text-left text-[11px] font-medium">
            <thead>
              <tr className="text-[10px] font-semibold">
                <th className="pb-1">{t("pages.startup")}</th>
                <th className="pb-1">{t("screening.country")}</th>
                <th className="pb-1">{t("pages.funding")}</th>
                <th className="pb-1">{t("pages.score")}</th>
              </tr>
            </thead>
            <tbody>
              {compare.map((row, i) => (
                <tr key={row.id} className={cn("cursor-pointer border-t border-line", row.id === deal.id && "bg-surface-2")} onClick={() => onSelect(row.id)}>
                  <td className="py-1 font-semibold">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: DOT[i % DOT.length] }} />
                    {row.name}
                  </td>
                  <td className="py-1">{row.country || "—"}</td>
                  <td className="max-w-[120px] truncate py-1">{row.fundingSought || "—"}</td>
                  <td className="py-1 font-mono">{scoreLabel(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ScoreRadar axes={axes} size={120} />
        </div>
      </DashCard>
    </div>
  );
}

function Fact({ label, value, href }: { label: string; value: string | null | undefined; href?: string | null }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-wide text-ink-3">{label}</div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="truncate font-medium text-[#c4a57a] underline-offset-2 hover:underline">
          {value}
        </a>
      ) : (
        <div className="truncate font-medium">{value || "—"}</div>
      )}
    </div>
  );
}
