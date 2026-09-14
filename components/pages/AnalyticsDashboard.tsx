"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ScreeningLandscape } from "@/components/charts/ScreeningLandscape";
import { Sparkline } from "@/components/charts/Sparkline";
import { DashCard } from "@/components/ui/Dash";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AnalyticsPayload } from "@/lib/startups/dashboard";
import { scoreLabel } from "@/lib/deal-view";

const WorldMap = dynamic(() => import("@/components/charts/WorldMap").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => <div className="h-[170px] animate-pulse rounded-md bg-surface-2" />,
});

type View = "list" | "status" | "breakdown";

export function AnalyticsDashboard({ initial }: { initial: AnalyticsPayload }) {
  const { t } = useLocale();
  const router = useRouter();
  const [view, setView] = useState<View>("status");
  const [page, setPage] = useState(0);
  const { data } = useQuery({
    queryKey: ["analytics", page],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?page=${page}`);
      if (!res.ok) throw new Error("Failed to load analytics.");
      return (await res.json()) as AnalyticsPayload;
    },
    initialData: page === 0 ? initial : undefined,
    placeholderData: keepPreviousData,
  });
  const payload = data ?? initial;
  const countries = payload.countries;
  const sectors = payload.sectors;
  const split = payload.split;
  const average = payload.average;
  const spark = payload.spark;
  const waiting = payload.waiting;
  const avgComplete = payload.avgComplete;
  const inflow = payload.inflow;
  const pageSize = payload.pageSize;
  const pages = payload.pages;
  const total = payload.total;
  const rows = payload.rows;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h1 className="font-sans text-[15px] font-semibold tracking-tight text-ink">{t("pages.analyticsTitle")}</h1>
        <div className="inline-flex rounded-md border border-line bg-surface p-0.5 text-[10.5px]">
          {(["list", "status", "breakdown"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn("rounded px-2 py-0.5", view === id ? "bg-surface-2 font-medium text-ink" : "text-ink-3")}
            >
              {id === "list" ? t("pages.list") : id === "status" ? t("pages.status") : t("pages.breakdown")}
            </button>
          ))}
        </div>
      </div>

      {view === "list" && (
        <DashCard padded={false}>
          <table className="w-full text-left text-[11px]">
            <thead className="text-[10px] uppercase text-ink-3">
              <tr>
                <th className="px-2.5 py-2">{t("pages.startup")}</th>
                <th className="px-2.5 py-2">{t("pages.sector")}</th>
                <th className="px-2.5 py-2">{t("screening.country")}</th>
                <th className="px-2.5 py-2">{t("pages.score")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="cursor-pointer border-t border-line hover:bg-surface-2" onClick={() => router.push(`/review?id=${encodeURIComponent(d.id)}`)}>
                  <td className="px-2.5 py-1.5">{d.name}</td>
                  <td className="px-2.5 py-1.5 text-ink-2">{d.sector || "—"}</td>
                  <td className="px-2.5 py-1.5 text-ink-2">{d.country || "—"}</td>
                  <td className="px-2.5 py-1.5 font-mono">{scoreLabel(d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashCard>
      )}

      {view === "status" && (
        <>
          <div className="grid gap-2 xl:grid-cols-[1.15fr_1fr_160px]">
            <DashCard>
              <div className="mb-0.5 text-[11px] font-medium">{t("pages.sectorByCountry")}</div>
              <WorldMap data={countries} height={170} showMarkers={false} palette="multi" onCountryClick={(label) => router.push(`/review?q=${encodeURIComponent(label)}`)} />
            </DashCard>
            <DashCard>
              <ScreeningLandscape points={payload.landscape ?? []} />
            </DashCard>
            <div className="flex flex-col gap-2">
              <DashCard className="flex flex-1 flex-col items-center">
                <div className="mb-1 w-full text-[11px] font-medium">{t("pages.kpiStats")}</div>
                <Gauge value={total} max={Math.max(280, total)} />
              </DashCard>
              <DashCard className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full text-[11px] font-semibold text-ink">Internal Splits</div>
                <Gauge value={Number(split.pct.toFixed(1))} max={100} small />
                <Gauge value={Number((average ?? 0).toFixed(1))} max={100} small />
              </DashCard>
            </div>
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Startups" value={String(total)} sub={`Awaiting review ${waiting}`} caption="Deal flow" series={spark} />
            <MetricTile label="Average AI score" value={average == null ? "—" : average.toFixed(1)} sub={`Inflow Δ ${inflow}`} caption="Scored deals only" series={spark} />
            <MetricTile label="Sector types" value={String(sectors.length)} sub={`${countries.length} geographies`} caption="CRM universe" series={spark} />
            <MetricTile label="Data completeness" value={`${avgComplete}%`} sub="Field coverage, not quality" caption="" series={spark} />
          </div>
        </>
      )}

      {view === "breakdown" && (
        <div className="grid gap-2 md:grid-cols-2">
          <DashCard>
            <div className="mb-2 text-[11px] font-medium">{t("pages.sector")}</div>
            <ul className="space-y-1">
              {sectors.slice(0, 12).map((s) => {
                const max = sectors[0]?.count || 1;
                return (
                  <li key={s.label}>
                    <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => router.push(`/review?sector=${encodeURIComponent(s.label)}`)}>
                      <span className="w-[92px] truncate text-[10px]">{s.label}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded bg-surface-2">
                        <span className="block h-full rounded bg-[#c4a57a]" style={{ width: `${Math.max(8, (s.count / max) * 100)}%` }} />
                      </span>
                      <span className="w-6 text-right font-mono text-[10px]">{s.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </DashCard>
          <DashCard>
            <div className="mb-2 text-[11px] font-medium">{t("pages.scoreDist")}</div>
            <ul className="space-y-1">
              {(payload.dist ?? []).map((bin) => {
                const max = Math.max(1, ...(payload.dist ?? []).map((b) => b.n));
                return (
                  <li key={bin.name} className="flex items-center gap-2">
                    <span className="w-8 font-mono text-[10px] text-ink-3">{bin.name}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded bg-surface-2">
                      <span className="block h-full rounded bg-[#5d9a7a]" style={{ width: `${Math.max(bin.n ? 8 : 0, (bin.n / max) * 100)}%` }} />
                    </span>
                    <span className="w-6 text-right font-mono text-[10px]">{bin.n}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[10px] text-ink-3">{t("pages.noAi")} Bins are scored deals only.</p>
          </DashCard>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[10px] text-ink-3">
        <span>
          Show {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of rows
        </span>
        <div className="flex items-center gap-2">
          <span>Sheets</span>
          <button type="button" className="rounded border border-line px-1.5" onClick={() => setPage((p) => Math.max(0, p - 1))}>
            ‹
          </button>
          <span>{page + 1}</span>
          <button type="button" className="rounded border border-line px-1.5" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

function Gauge({ value, max, small }: { value: number; max: number; small?: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  const size = small ? 64 : 88;
  const r = small ? 22 : 32;
  const c = 2 * Math.PI * r;
  const label = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={7} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#c4a57a"
        strokeWidth={7}
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="54%" textAnchor="middle" fill="var(--ink)" fontSize={small ? 12 : 16} fontWeight={600}>
        {label}
      </text>
    </svg>
  );
}

function MetricTile({
  label,
  value,
  sub,
  caption,
  series,
}: {
  label: string;
  value: string;
  sub: string;
  caption: string;
  series: number[];
}) {
  return (
    <DashCard>
      <div className="text-[10px] font-semibold text-ink">{label}</div>
      <div className="mt-0.5 flex items-end justify-between">
        <div>
          <div className="font-display text-[18px] font-semibold">{value}</div>
          <div className="mt-0.5 text-[10px] text-positive">{sub}</div>
        </div>
        <Sparkline values={series} color="#3d8a5c" />
      </div>
      {caption ? <div className="mt-1 text-[10px] text-ink-3">{caption}</div> : null}
    </DashCard>
  );
}
