"use client";

import Link from "next/link";
import { Award, Calendar, ExternalLink, FileSpreadsheet, FileText, Folder, Mail, MoreVertical, Pencil, Percent, Phone } from "lucide-react";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Mark, ScorePill, StatusChip } from "@/components/erp/ui";
import { relativeFr } from "@/lib/erp/model";
import { Button } from "@/components/ui/Button";
import type { FichePayload } from "@/lib/erp/payloads";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { localizePhrase } from "@/lib/erp/labels";
import { formatAppDate } from "@/lib/dates";

const DOTS = ["bg-cvd", "bg-[#16A34A]", "bg-[#7c3aed]", "bg-cvd", "bg-slate-400"];

export function CompanyFiche({
  data,
  backHref,
  backLabel,
}: {
  data: NonNullable<FichePayload>;
  backHref: string;
  backLabel: string;
}) {
  const { t, locale } = useLocale();
  const { deal, company } = data;
  const portfolio = backHref.startsWith("/portfolio");
  const metrics: { label: string; value: string; score?: boolean; pill?: boolean }[] = portfolio
    ? [
        { label: t("erp.ficInvestDate"), value: company?.investDate || deal.dateEntered || "—" },
        { label: t("erp.ficAmount"), value: company?.investCvd || "—" },
        { label: t("erp.ficEntryVal"), value: company?.valoInitial || "—" },
        { label: t("erp.ficCurrentVal"), value: company?.valoFinal || company?.valoInitial || "—" },
        { label: t("erp.multiple"), value: "—" },
        { label: t("erp.status"), value: company?.situation || data.statusLabel.label, pill: true },
      ]
    : [
        ...data.kpis.map((k) => ({ label: k.label, value: k.value })),
        { label: t("erp.ficPriorityScore"), value: data.score == null ? "—" : String(data.score), score: true },
        { label: t("erp.status"), value: data.statusLabel.label, pill: true },
      ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="text-[12px] text-ink-3">
        {backLabel} / <span className="text-ink">{deal.name}</span>
      </div>
      <div className="erp-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Mark name={deal.name} className="h-14 w-14 text-[20px]" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[24px] font-bold text-ink">{deal.name}</h1>
                {deal.sector ? <StatusChip label={deal.sector} tone="blue" /> : null}
              </div>
              <p className="text-[13px] text-ink-3">{t("erp.ficFull")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={backHref} className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-[13px]">
              ← {t("erp.ficBack", { label: backLabel })}
            </Link>
            <button type="button" className="rounded-lg p-2 text-ink-3" aria-label={t("erp.sitMenu")}>
              <MoreVertical className="h-4 w-4" />
            </button>
            <Button size="sm">
              <Pencil className="h-3.5 w-3.5" /> {t("erp.ficEdit")}
            </Button>
          </div>
        </div>
        <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${portfolio ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>
          {metrics.slice(0, portfolio ? 6 : 5).map((m) => (
            <div key={m.label} className="rounded-xl bg-canvas px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-ink-3">
                {m.score ? <Award className="h-4 w-4 text-[#16A34A]" /> : m.label.includes("Churn") ? <Percent className="h-4 w-4" /> : m.label.includes("interaction") || m.label.includes("investissement") ? <Calendar className="h-4 w-4" /> : null}
                {m.label}
              </div>
              <div className="mt-1 text-[18px] font-bold">
                {"score" in m && m.score ? <ScorePill score={data.score} /> : "pill" in m && m.pill ? <StatusChip label={String(m.value)} tone={data.statusLabel.tone} /> : m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="erp-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">{t("erp.ficOverview")}</h2>
            <span className="text-[13px] text-cvd">{t("erp.ficSeeAll")}</span>
          </div>
          <dl>
            {(portfolio ? portfolioFacts(data, t) : data.facts).map((f) => (
              <div key={f.label} className="grid grid-cols-[160px_1fr] gap-3 border-t border-line py-2.5 first:border-t-0">
                <dt className="text-[12px] text-ink-3">{f.label}</dt>
                <dd className="text-[13px] text-ink">
                  {(f.label === t("erp.website") || f.label === "Site web") && typeof f.value === "string" && f.value.startsWith("http") ? (
                    <a href={f.value} className="inline-flex items-center gap-1 text-cvd" target="_blank" rel="noreferrer">
                      {f.value} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    f.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        {portfolio ? (
          <section className="erp-card p-5">
            <h2 className="mb-3 text-[15px] font-semibold">{t("erp.ficValue")}</h2>
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={valueSeries(company?.investCvd, company?.valoFinal || company?.valoInitial)}>
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="invested" name={t("erp.capitalInvested")} fill="#93C5FD" radius={4} />
                  <Bar dataKey="value" name={t("erp.estimatedValue")} fill="var(--cvd)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[12px] text-ink-3">{t("erp.ficAmountsNote")}</p>
          </section>
        ) : (
          <ActivityCard activity={data.activity as { when: string; title: string; detail: string }[]} />
        )}
      </div>
      {portfolio ? <ActivityCard activity={data.activity as { when: string; title: string; detail: string }[]} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="erp-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">{t("erp.ficDocs")}</h2>
            <Link href="/documents" className="text-[13px] text-cvd">{t("erp.ficSeeAll")}</Link>
          </div>
          <ul className="space-y-2">
            {data.docs.length === 0 ? (
              <li className="text-[13px] text-ink-3">{t("erp.ficNoDocs")}</li>
            ) : (
              data.docs.map((d: { label: string; href: string; mimeType?: string | null; documentType?: string | null }) => {
                const pdf = /pdf/i.test(d.mimeType || "") || /\.pdf$/i.test(d.label);
                const xls = /sheet|excel|xls/i.test(d.mimeType || "") || /\.xls/i.test(d.label);
                const Icon = pdf ? FileText : xls ? FileSpreadsheet : /folder|room/i.test(d.label) ? Folder : FileText;
                return (
                  <li key={d.href} className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-canvas">
                    <Icon className={cn("h-4 w-4", pdf ? "text-red-500" : xls ? "text-green-600" : "text-cvd")} />
                    <a href={d.href} className="flex-1 truncate text-[13px] text-ink">{d.label}</a>
                    <span className="text-[11px] text-ink-3">{d.documentType || ""}</span>
                    <MoreVertical className="h-3.5 w-3.5 text-ink-3" />
                  </li>
                );
              })
            )}
          </ul>
        </section>
        <section className="erp-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">{t("erp.ficContacts")}</h2>
            <Link href="/relations" className="text-[13px] text-cvd">{t("erp.ficSeeContacts")}</Link>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Mark name={deal.founder || deal.name} className="h-12 w-12 rounded-full text-[14px]" />
              <div className="text-[13px]">
                <div className="font-semibold">{deal.founder || t("erp.ficNoContact")}</div>
                <div className="text-ink-3">{t("erp.founder")}</div>
                <div className="mt-1 flex items-center gap-1 text-ink-2"><Mail className="h-3 w-3" /> {deal.email || "—"}</div>
                <div className="flex items-center gap-1 text-ink-2"><Phone className="h-3 w-3" /> {deal.whatsapp || "—"}</div>
              </div>
            </div>
            <div className="ml-auto space-y-1 text-[12px] text-ink-2">
              <div>{t("erp.ficLastCall", { when: relativeFr(deal.dateUpdated) })}</div>
              <div>{t("erp.ficLastEmail")}</div>
              <div>{t("erp.ficNextMeet")}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ActivityCard({ activity }: { activity: { when: string; title: string; detail: string }[] }) {
  const { t, locale } = useLocale();
  const L = (s: string) => localizePhrase(locale, s);
  return (
    <section className="erp-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{t("erp.ficActivity")}</h2>
        <span className="text-[13px] text-cvd">{t("erp.ficSeeAll")}</span>
      </div>
      {activity.length === 0 ? (
        <p className="text-[13px] text-ink-3">{t("erp.ficNoActivity")}</p>
      ) : (
        <ol className="relative space-y-4 border-l border-line pl-4">
          {activity.map((a, i) => (
            <li key={a.title + a.when} className="relative">
              <span className={cn("absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full", DOTS[i % DOTS.length])} />
              <div className="text-[11px] text-ink-3">{formatAppDate(a.when, locale)}</div>
              <div className="text-[13px] font-semibold">{L(a.title)}</div>
              <div className="text-[12px] text-ink-3">{a.detail}</div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function portfolioFacts(data: NonNullable<FichePayload>, t: (key: string) => string) {
  const { deal, company } = data;
  return [
    { label: t("erp.activity"), value: deal.sector || company?.situation || "—" },
    { label: t("erp.country"), value: deal.country || company?.country || "—" },
    { label: t("erp.entryStage"), value: company?.round || "—" },
    { label: t("erp.entryDate"), value: company?.investDate || deal.dateEntered || "—" },
    { label: t("erp.stakeHeld"), value: company?.pctCvd || "—" },
    { label: t("erp.coInvestors"), value: company?.investHolmarcom || "—" },
    { label: t("erp.boardFollow"), value: company?.position || "—" },
    { label: t("erp.website"), value: deal.websiteUrl || "—" },
  ];
}

function parseMoney(raw: string | null | undefined) {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function valueSeries(invested?: string | null, value?: string | null) {
  const investedN = parseMoney(invested);
  const valueN = parseMoney(value);
  return [
    { year: "2024", invested: 0, value: 0 },
    { year: "2025", invested: 0, value: 0 },
    { year: "2026", invested: investedN, value: valueN },
  ];
}
