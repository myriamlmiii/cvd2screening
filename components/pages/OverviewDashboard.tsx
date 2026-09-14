"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { PipelineDepth } from "@/components/viz/PipelineDepth";
import { DashCard, DealAvatar, SelectFilter } from "@/components/ui/Dash";
import { Button } from "@/components/ui/Button";
import { scoreLabel, summary } from "@/lib/deal-view";
import { aiRecommendation, crmStatus } from "@/lib/crm";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { OverviewPayload } from "@/lib/startups/dashboard";
import type { ScoredDeal } from "@/types";

const WorldMap = dynamic(() => import("@/components/charts/WorldMap").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => <div className="h-[140px] animate-pulse rounded-md bg-surface-2" />,
});

const DOT = ["#c4a57a", "#8b7cc8", "#5aa8a4", "#6a849c", "#c4a07a", "#5d9a7a"];

export function OverviewDashboard({ initial }: { initial: OverviewPayload }) {
  const { t } = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [sector, setSector] = useState("all");
  const [origin, setOrigin] = useState("all");
  const [queueStatus, setQueueStatus] = useState("all");

  const { data } = useQuery({
    queryKey: ["overview", status, sector, origin],
    queryFn: async () => {
      const p = new URLSearchParams({ status, sector, origin });
      const res = await fetch(`/api/dashboard?${p}`);
      if (!res.ok) throw new Error("Failed to load dashboard.");
      return (await res.json()) as OverviewPayload;
    },
    initialData: initial,
    placeholderData: keepPreviousData,
  });

  const statuses = data.statuses;
  const sectors = data.sectors;
  const countries = data.countries;
  const spark = data.spark;
  const splitSpark = data.awaitingSpark;
  const awaiting = data.awaiting;
  const strong = data.strongFits;
  const insight = data.insight;
  const cards = data.cards as ScoredDeal[];
  const queue = (queueStatus === "all" ? data.queue : data.queue.filter((d) => (d.status || "—") === queueStatus)).slice(0, 8);

  return (
    <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h1 className="font-sans text-[14px] font-semibold tracking-tight text-ink md:text-[15px]">{t("pages.overviewTitle")}</h1>
          <Button type="button" size="xs" onClick={() => window.dispatchEvent(new Event("cvd:open-palette"))}>
            <Plus className="h-3 w-3" />
            {t("pages.newStartup")}
          </Button>
        </div>

        <div className="mb-2 grid gap-2 sm:grid-cols-3">
          <Kpi label={t("pages.totalStartups")} value={String(data.total)} spark={spark} onClick={() => router.push("/review")} />
          <Kpi label={t("pages.awaitingReview")} value={String(awaiting)} spark={splitSpark} onClick={() => router.push("/review?queue=1")} />
          <Kpi label={t("pages.strongFits")} value={String(strong)} spark={spark} gold onClick={() => router.push("/review?rec=Strong%20Fit")} />
        </div>
        {statuses.length > 0 ? (
          <div className="mb-2">
            <PipelineDepth stages={statuses} onSelect={(label) => router.push(`/review?status=${encodeURIComponent(label)}`)} />
          </div>
        ) : null}
        {insight ? <p className="mb-2 text-[10px] font-medium text-ink-2">{insight}</p> : null}

        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <SelectFilter label={t("pages.status")} value={status} onChange={setStatus} options={[{ value: "all", label: t("pages.all") }, ...statuses.map((s) => ({ value: s.label, label: s.label }))]} />
          <SelectFilter label={t("pages.sector")} value={sector} onChange={setSector} options={[{ value: "all", label: t("pages.all") }, ...sectors.slice(0, 24).map((s) => ({ value: s.label, label: s.label }))]} />
          <SelectFilter
            label={t("pages.origin")}
            value={origin}
            onChange={setOrigin}
            options={[
              { value: "all", label: t("pages.all") },
              { value: "internal", label: t("overview.filterInternal") },
              { value: "external", label: t("overview.filterExternal") },
            ]}
          />
          <span className="ml-auto text-[10px] font-medium text-ink">{t("pages.filters")}</span>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {cards.map((deal) => (
            <DashCard key={deal.id} className="flex cursor-pointer flex-col" onClick={() => router.push(`/review?id=${encodeURIComponent(deal.id)}`)}>
              <div className="flex items-start gap-2">
                <DealAvatar name={deal.name} />
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-ink">{deal.name}</div>
                  <div className="text-[10px] font-medium text-ink-2">{deal.sector || "—"} · {crmStatus(deal)} · {aiRecommendation(deal)}</div>
                </div>
                <span className="ml-auto font-mono text-[12px] font-semibold">{scoreLabel(deal)}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-snug text-ink-2">{summary(deal)}</p>
            </DashCard>
          ))}
        </div>
      </div>

      <aside className="flex min-w-0 flex-col gap-2">
        <DashCard padded={false} className="flex-1">
          <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-1.5">
            <div className="text-[11px] font-semibold text-ink">{t("pages.queue")}</div>
            <select value={queueStatus} onChange={(e) => setQueueStatus(e.target.value)} className="h-6 rounded-md border border-line bg-surface px-1.5 text-[10px] font-medium text-ink">
              <option value="all">{t("pages.status")}</option>
              {statuses.map((s) => (
                <option key={s.label} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <ul>
            {queue.map((deal, i) => (
              <li key={deal.id} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5" onClick={() => router.push(`/review?id=${encodeURIComponent(deal.id)}`)}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: DOT[i % DOT.length] }} />
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink">{deal.name}</span>
                <span className="font-mono text-[10px] font-semibold text-ink">{scoreLabel(deal)}</span>
              </li>
            ))}
          </ul>
        </DashCard>
        <DashCard>
          <div className="mb-0.5 text-[11px] font-semibold text-ink">{t("pages.worldMap")}</div>
          <WorldMap data={countries} height={140} onCountryClick={(label) => router.push(`/review?q=${encodeURIComponent(label)}`)} />
        </DashCard>
      </aside>
    </div>
  );
}

function Kpi({ label, value, hint, spark, gold, onClick }: { label: string; value: string; hint?: string; spark: number[]; gold?: boolean; onClick?: () => void }) {
  return (
    <DashCard className={cn("py-2", onClick && "cursor-pointer")} onClick={onClick}>
      <div className="text-[10px] font-semibold text-ink">{label}</div>
      <div className="mt-0.5 flex items-end justify-between gap-2">
        <div className={cn("font-sans text-[20px] font-semibold leading-none", gold ? "text-[#c4a57a]" : "text-ink")}>{value}</div>
        <div className="flex items-center gap-1.5">
          {hint && <span className="text-[10px] font-semibold text-positive">{hint}</span>}
          <Sparkline values={spark} color={gold ? "#c4a57a" : "#5d9a7a"} />
        </div>
      </div>
    </DashCard>
  );
}
