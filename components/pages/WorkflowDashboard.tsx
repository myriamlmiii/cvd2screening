"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DashCard, DealAvatar, SelectFilter } from "@/components/ui/Dash";
import { Button } from "@/components/ui/Button";
import { daysInStage, scoreLabel } from "@/lib/deal-view";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { WorkflowPayload } from "@/lib/startups/dashboard";

const COLUMN_REVIEW: Record<string, string> = {
  intake: "/review?status=" + encodeURIComponent("À contacter"),
  screening: "/review",
  reviewing: "/review?status=" + encodeURIComponent("En étude"),
  shortlisted: "/review?status=" + encodeURIComponent("Shortlistée"),
  pass: "/review?status=" + encodeURIComponent("Déclinée"),
};

export function WorkflowDashboard({ initial }: { initial: WorkflowPayload }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [sector, setSector] = useState("all");
  const { data } = useQuery({
    queryKey: ["workflow", sector],
    queryFn: async () => {
      const res = await fetch(`/api/workflow?sector=${encodeURIComponent(sector)}`);
      if (!res.ok) throw new Error("Failed to load workflow.");
      return (await res.json()) as WorkflowPayload;
    },
    initialData: sector === "all" ? initial : undefined,
    placeholderData: keepPreviousData,
  });
  const payload = data ?? initial;
  const sectors = payload.sectors;
  const grouped = payload.columns;
  const split = payload.split;
  const average = payload.average;
  const reviewingScore = payload.reviewingScore;
  const log = payload.log;
  const filteredCount = payload.total;

  return (
    <div className="tpl-starfield -mx-3 min-h-[calc(100vh-36px)] px-3 py-1">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-sans text-[14px] font-semibold tracking-tight text-ink md:text-[15px]">{t("pages.workflowTitle")}</h1>
        <div className="flex flex-wrap items-center gap-3 text-right">
          <HeaderStat label="New Intake" value={String(filteredCount)} />
          <HeaderStat label="AI Screening" value={`${split.pct}%`} />
          <HeaderStat label="Reviewing" value={reviewingScore == null ? "—" : reviewingScore.toFixed(1)} />
          <HeaderStat label={t("pages.averageScore")} value={average == null ? "—" : average.toFixed(1)} gold />
        </div>
      </div>
      <JobsStrip />

      <div className="mb-2 grid gap-2 overflow-x-auto pb-1 lg:grid-cols-5">
        {grouped.map((col) => {
          const items = col.items;
          return (
            <div key={col.id} className="min-w-[160px] overflow-hidden rounded-[10px] border border-line bg-surface">
              <button
                type="button"
                className={cn("flex w-full items-center justify-between px-2 py-1.5 text-left text-[10.5px] font-semibold", col.header)}
                onClick={() => router.push(COLUMN_REVIEW[col.id] || "/review")}
              >
                <span>{locale === "fr" ? col.titleFr : col.title}</span>
                <span className="font-mono text-[10px] opacity-80">{col.count}</span>
              </button>
              <div className="flex max-h-[280px] flex-col gap-1.5 overflow-y-auto p-1.5">
                {items.map((deal) => (
                  <button
                    type="button"
                    key={deal.id}
                    className="workflow-card rounded-md bg-canvas/70 p-1.5 text-left"
                    onClick={() => router.push(`/review?id=${encodeURIComponent(deal.id)}`)}
                  >
                    <div className="flex items-center gap-1.5">
                      <DealAvatar name={deal.name} className="h-5 w-5 text-[9px]" />
                      <div className="min-w-0 truncate text-[11px] font-medium text-ink">{deal.name}</div>
                    </div>
                    <div className="mt-1 space-y-0.5 text-[10px] font-medium text-ink">
                      <div className="flex justify-between">
                        <span>{t("pages.daysInStage")}</span>
                        <span className="font-mono text-ink-2">{daysInStage(deal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("pages.aiConfidence")}</span>
                        <span className="font-mono text-ink-2">{scoreLabel(deal)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.45fr)_minmax(240px,0.85fr)]">
        <DashCard padded={false}>
          <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-1.5">
            <div className="text-[11px] font-medium text-ink">{t("pages.decisionLog")}</div>
            <SelectFilter
              label=""
              value={sector}
              onChange={setSector}
              options={[{ value: "all", label: t("pages.filters") }, ...sectors.slice(0, 20).map((s) => ({ value: s.label, label: s.label }))]}
            />
          </div>
          <table className="w-full text-left text-[11px]">
            <thead className="text-[10px] text-ink-3">
              <tr>
                <th className="px-2.5 py-1.5 font-medium">{t("pages.startup")}</th>
                <th className="px-2.5 py-1.5 font-medium">{t("pages.sector")}</th>
                <th className="px-2.5 py-1.5 font-medium">{t("pages.origin").split("/")[0]}</th>
                <th className="px-2.5 py-1.5 font-medium">{t("pages.updated")}</th>
              </tr>
            </thead>
            <tbody>
              {log.map((deal) => (
                <tr key={deal.id} className="cursor-pointer border-t border-line hover:bg-surface-2" onClick={() => router.push(`/review?id=${encodeURIComponent(deal.id)}`)}>
                  <td className="px-2.5 py-1.5 text-ink">{deal.name}</td>
                  <td className="px-2.5 py-1.5 text-ink-2">{deal.sector || "—"}</td>
                  <td className="px-2.5 py-1.5 text-ink-2">{deal.source || "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono text-[10px] text-ink-3">{deal.dateUpdated || deal.dateEntered || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashCard>

        <DashCard>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-medium text-ink">{t("pages.statusOverview")}</div>
            <span className="text-[10px] font-medium text-ink">{t("pages.pipelineProcess")}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
            <StatRing label="Startups" value={String(filteredCount)} />
            <StatRing label="Internal %" value={split.pct.toFixed(1)} />
            <StatRing label={t("pages.averageScore")} value={average == null ? "—" : average.toFixed(1)} />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="mt-2 w-full justify-end text-[#c4a57a] hover:bg-transparent hover:text-[#c4a57a]"
            onClick={() => router.push("/review?queue=1")}
          >
            Open review queue
          </Button>
        </DashCard>
      </div>
    </div>
  );
}

function JobsStrip() {
  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      if (!res.ok) return { jobs: [] as { id: string; type: string; status: string }[] };
      return (await res.json()) as { jobs: { id: string; type: string; status: string }[] };
    },
    staleTime: 60_000,
  });
  const jobs = data?.jobs ?? [];
  if (!jobs.length) return null;
  return (
    <p className="mb-2 truncate text-[10px] text-ink-3">
      Jobs: {jobs.slice(0, 4).map((j) => `${j.type} ${j.status}`).join(" · ")}
    </p>
  );
}

function HeaderStat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div>
      <div className="text-[9px] text-ink-3">{label}</div>
      <div className={cn("font-display text-[14px] font-semibold leading-tight", gold ? "text-[#c4a57a]" : "text-ink")}>{value}</div>
    </div>
  );
}

function StatRing({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full border-[2.5px] border-[#5d9a7a] text-[12px] font-semibold text-ink">
        {value}
      </div>
      <div className="mt-1 text-[9px] leading-tight text-ink-3">{label}</div>
    </div>
  );
}
