"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Layers, PieChart } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart as RPie, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { PageHeader, StatCard } from "@/components/erp/ui";
import type { PipelinePayload } from "@/lib/erp/payloads";
import type { ScoredDeal } from "@/types";
import { displayScore } from "@/lib/deal-view";
import { funnelStage } from "@/lib/erp/model";
import { useLocale } from "@/lib/i18n";

const COLORS = ["var(--cvd)", "#16A34A", "#D97706", "#7c3aed", "#DC2626"];

export function AnalysesBoard({
  pipeline,
  deals,
}: {
  pipeline: PipelinePayload;
  deals: { id: string; name: string; sector: string | null; country: string | null; dateEntered: string | null; score: number | null; stage: string }[];
}) {
  const { t } = useLocale();
  const [bucket, setBucket] = useState<string | null>(null);
  const scored = deals.filter((d) => d.score != null);
  const buckets = [
    { label: "80+", n: scored.filter((d) => (d.score ?? 0) >= 80).length },
    { label: "60–79", n: scored.filter((d) => (d.score ?? 0) >= 60 && (d.score ?? 0) < 80).length },
    { label: "40–59", n: scored.filter((d) => (d.score ?? 0) >= 40 && (d.score ?? 0) < 60).length },
    { label: "<40", n: scored.filter((d) => (d.score ?? 0) < 40).length },
    { label: t("erp.anaUnscored"), key: "unscored", n: deals.length - scored.length },
  ];
  const inBucket = useMemo(() => {
    if (!bucket) return deals;
    if (bucket === "unscored" || bucket === t("erp.anaUnscored")) return deals.filter((d) => d.score == null);
    if (bucket === "80+") return deals.filter((d) => (d.score ?? -1) >= 80);
    if (bucket === "60–79") return deals.filter((d) => d.score != null && d.score >= 60 && d.score < 80);
    if (bucket === "40–59") return deals.filter((d) => d.score != null && d.score >= 40 && d.score < 60);
    if (bucket === "<40") return deals.filter((d) => d.score != null && d.score < 40);
    return deals;
  }, [bucket, deals, t]);
  const byMonth = new Map<string, number>();
  for (const d of deals) {
    if (!d.dateEntered) continue;
    const key = d.dateEntered.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const sourcing = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, n]) => ({ month, n }));
  const bySector = new Map<string, { n: number; sum: number; scored: number }>();
  for (const d of deals) {
    const key = d.sector || "Autre";
    const cur = bySector.get(key) ?? { n: 0, sum: 0, scored: 0 };
    cur.n += 1;
    if (d.score != null) {
      cur.sum += d.score;
      cur.scored += 1;
    }
    bySector.set(key, cur);
  }
  const sectorRows = [...bySector.entries()]
    .map(([sector, v]) => ({ sector, n: v.n, avg: v.scored ? Math.round(v.sum / v.scored) : null }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title={t("erp.anaTitle")} subtitle={t("erp.anaSubtitle")} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Layers className="h-4 w-4" />} value={String(pipeline.total)} label={t("erp.anaActive")} />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} value={String(scored.length)} label={t("erp.anaScored")} />
        <StatCard
          icon={<PieChart className="h-4 w-4" />}
          value={scored.length ? String(Math.round(scored.reduce((s, d) => s + (d.score ?? 0), 0) / scored.length)) : "—"}
          label={t("erp.anaAvg")}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="erp-card p-4">
          <h3 className="mb-3 text-[13px] font-semibold">{t("erp.anaDist")}</h3>
          <div className="flex items-center gap-3">
            <div className="relative h-40 w-40">
              <ResponsiveContainer>
                <RPie>
                  <Pie data={buckets} dataKey="n" nameKey="label" innerRadius={40} outerRadius={62}>
                    {buckets.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </RPie>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1 text-[12px]">
              {buckets.map((b, i) => (
                <li key={b.label}>
                  <button
                    type="button"
                    className="flex items-center gap-2"
                    onClick={() => setBucket(b.key ?? b.label)}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} /> {b.label} · {b.n}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="erp-card p-4">
          <h3 className="mb-3 text-[13px] font-semibold">{t("erp.anaSourcing")}</h3>
          {sourcing.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-ink-3">{t("erp.anaNoDate")}</p>
          ) : (
            <div className="h-44">
              <ResponsiveContainer>
                <BarChart data={sourcing}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="n" fill="var(--cvd)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      <section className="erp-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="text-[15px] font-semibold">{bucket ? `${t("erp.anaDist")} · ${bucket}` : t("erp.anaMix")}</div>
          {bucket ? (
            <button type="button" className="text-[13px] text-cvd" onClick={() => setBucket(null)}>
              {t("erp.reset")}
            </button>
          ) : null}
        </div>
        {bucket ? (
          <table className="erp-table w-full">
            <thead>
              <tr>
                <th>{t("erp.sitStartup")}</th>
                <th>{t("erp.pipeSector")}</th>
                <th>{t("erp.priorityScore")}</th>
              </tr>
            </thead>
            <tbody>
              {inBucket.slice(0, 20).map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/pipeline/${d.id}`} className="font-medium text-cvd">
                      {d.name}
                    </Link>
                  </td>
                  <td>{d.sector || "—"}</td>
                  <td>{d.score ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="erp-table w-full">
            <thead>
              <tr>
                <th>{t("erp.pipeSector")}</th>
                <th>{t("erp.anaFiles")}</th>
                <th>{t("erp.anaAvgScore")}</th>
              </tr>
            </thead>
            <tbody>
              {sectorRows.map((r) => (
                <tr key={r.sector}>
                  <td className="font-medium">{r.sector}</td>
                  <td>{r.n}</td>
                  <td>{r.avg ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export function analysesDeals(deals: ScoredDeal[]) {
  return deals.map((d) => ({
    id: d.id,
    name: d.name,
    sector: d.sector,
    country: d.country,
    dateEntered: d.dateEntered,
    score: displayScore(d),
    stage: funnelStage(d),
  }));
}
