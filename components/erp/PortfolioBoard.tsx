"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Clock, Database, Download, PieChart, Plus, Search, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart as RPie, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Legend } from "recharts";
import { Mark, PageHeader, StatCard, StatusChip, CountryCell } from "@/components/erp/ui";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { moneyFr } from "@/lib/erp/model";
import { useLocale } from "@/lib/i18n";
import { localizePhrase } from "@/lib/erp/labels";
import type { PortfolioPayload } from "@/lib/erp/payloads";

const COLORS = ["var(--cvd)", "#16A34A", "#D97706", "#7c3aed", "#DC2626"];

export function PortfolioBoard({ data }: { data: PortfolioPayload }) {
  const { kpis, rows, sectors, geos, years } = data;
  const { t, locale } = useLocale();
  const router = useRouter();
  const L = (s: string | null | undefined) => localizePhrase(locale, s);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("name");
  const filtered = useMemo(() => {
    const list = rows.filter((r) => !q.trim() || `${r.name} ${r.sector} ${r.country}`.toLowerCase().includes(q.toLowerCase()));
    return [...list].sort((a, b) => (sort === "date" ? String(b.investDate).localeCompare(String(a.investDate)) : a.name.localeCompare(b.name)));
  }, [rows, q, sort]);
  const chartYears = years ?? [
    { year: "2024", invested: 0, value: 0 },
    { year: "2025", invested: 0, value: 0 },
    { year: "2026", invested: kpis.invested || 0, value: kpis.value || 0 },
  ];
  const uplift = kpis.invested && kpis.value && kpis.invested > 0 ? `${Math.round((kpis.value / kpis.invested - 1) * 100)}%` : undefined;
  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={t("erp.portTitle")}
        subtitle={t("erp.portSubtitle")}
        action={<Button><Plus className="h-4 w-4" /> {t("erp.portAdd")}</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<Database className="h-4 w-4" />} value={String(kpis.count)} label={t("erp.portActive")} />
        <StatCard icon={<PieChart className="h-4 w-4" />} value={kpis.invested ? moneyFr(kpis.invested) : "—"} label={t("erp.portCapital")} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} value={kpis.value ? moneyFr(kpis.value) : "—"} label={t("erp.portValue")} hint={uplift} iconClass="bg-[#DCFCE7] text-[#16A34A]" />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} value={kpis.multiple ? `${kpis.multiple.toFixed(1)}x` : "—"} label={t("erp.portTvpi")} />
        <StatCard icon={<Clock className="h-4 w-4" />} value={String(kpis.exits)} label={t("erp.portExits")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Donut title={t("erp.portBySector")} data={sectors} center={t("erp.portHoldings", { n: kpis.count })} empty={t("erp.portNoMix")} />
        <Donut title={t("erp.portByGeo")} data={geos} center={t("erp.portHoldings", { n: kpis.count })} empty={t("erp.portNoMix")} />
        <div className="erp-card p-4">
          <h3 className="mb-2 text-[13px] font-semibold">{t("erp.portValueChart")}</h3>
          <div className="h-44">
            <ResponsiveContainer>
              <BarChart data={chartYears}>
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="invested" name={t("erp.capitalInvested")} fill="#93C5FD" radius={4} />
                <Bar dataKey="value" name={t("erp.estimatedValue")} fill="var(--cvd)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!kpis.invested && !kpis.value ? <p className="mt-2 text-[12px] text-ink-3">{t("erp.portNoAmounts")}</p> : <p className="mt-2 text-[12px] text-ink-3">{t("erp.portValueNote")}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[13px]">
          <Search className="h-4 w-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("erp.portSearch")} className="w-full outline-none" />
        </div>
        <select className="h-9 rounded-lg border border-line bg-surface px-2 text-[13px]" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name">{t("erp.portSortName")}</option>
          <option value="date">{t("erp.portSortDate")}</option>
        </select>
        <Button
          variant="secondary"
          type="button"
          onClick={() => {
            const header = ["name", "sector", "country", "investDate", "investCvd", "valoInitial", "valoFinal", "situation"];
            const body = filtered.map((r) => [r.name, r.sector, r.country, r.investDate, r.investCvd, r.valoInitial, r.valoFinal, r.situation].map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","));
            const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "portfolio.csv";
            a.click();
            URL.revokeObjectURL(url);
            toast.success(t("erp.exportCsv"));
          }}
        >
          <Download className="h-4 w-4" /> {t("erp.export")}
        </Button>
      </div>
      <section className="erp-card overflow-hidden">
        <table className="erp-table w-full">
          <thead>
            <tr>
              <th>{t("erp.sitStartup")}</th>
              <th>{t("erp.pipeSector")}</th>
              <th>{t("erp.country")}</th>
              <th>{t("erp.investDate")}</th>
              <th>{t("erp.amountInvested")}</th>
              <th>{t("erp.entryValuation")}</th>
              <th>{t("erp.currentValuation")}</th>
              <th>{t("erp.multiple")}</th>
              <th>{t("erp.status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="erp-row-link" onClick={() => router.push(`/portfolio/${r.id}`)}>
                <td>
                  <div className="flex items-center gap-2">
                    <Mark name={r.name} className="h-7 w-7" />
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-[11px] text-ink-3">{r.sector || r.situation || t("erp.portHolding")}</div>
                    </div>
                  </div>
                </td>
                <td>{r.sector ? <StatusChip label={r.sector} tone="blue" /> : "—"}</td>
                <td><CountryCell country={r.country} /></td>
                <td>{r.investDate || "—"}</td>
                <td>{r.investCvd || "—"}</td>
                <td>{r.valoInitial || "—"}</td>
                <td>{r.valoFinal || "—"}</td>
                <td>{r.multiple || "—"}</td>
                <td><StatusChip label={L(r.situation) || t("erp.portActiveStatus")} tone="green" /></td>
                <td>
                  <Link href={`/portfolio/${r.id}`} className="text-cvd" onClick={(e) => e.stopPropagation()}>→</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Donut({ title, data, center, empty }: { title: string; data: { label: string; n: number }[]; center: string; empty: string }) {
  const total = data.reduce((s, d) => s + d.n, 0) || 1;
  return (
    <div className="erp-card p-4">
      <h3 className="mb-2 text-[13px] font-semibold">{title}</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-ink-3">{empty}</p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="relative h-36 w-36">
            <ResponsiveContainer>
              <RPie>
                <Pie data={data} dataKey="n" nameKey="label" innerRadius={38} outerRadius={58}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </RPie>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-[11px] font-semibold leading-tight">{center}</div>
          </div>
          <ul className="space-y-1 text-[12px]">
            {data.map((d, i) => (
              <li key={d.label} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {d.label} {Math.round((d.n / total) * 100)}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
