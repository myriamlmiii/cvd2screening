"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  FileText,
  ListChecks,
  MoreVertical,
  Percent,
  Target,
} from "lucide-react";
import { Mark, ScorePill, StatusChip } from "@/components/erp/ui";
import { ErpOverlay } from "@/components/erp/Overlay";
import { NoteText } from "@/components/erp/NoteText";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { localizePhrase } from "@/lib/erp/labels";
import { clipText } from "@/lib/text";
import type { SituationPayload } from "@/lib/erp/payloads";

export function SituationHome({ data }: { data: SituationPayload }) {
  const featured = data.featured;
  const { t, locale } = useLocale();
  const router = useRouter();
  const L = (s: string) => localizePhrase(locale, s);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [resolved, setResolved] = useState(false);
  const queue = resolved ? [] : data.pending;
  const pending = queue.length;
  const subject = queue[0] ?? null;

  return (
    <div className="animate-fade-in space-y-4">
      <h1 className="text-[22px] font-bold uppercase tracking-wide text-ink">{t("erp.sitTitle")}</h1>

      {pending > 0 ? (
        <button
          type="button"
          onClick={() => setDecisionOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-[#FEF2F2] px-4 py-3 text-left dark:border-red-900/60 dark:bg-red-950/40"
        >
          <AlertCircle className="h-5 w-5 text-[#DC2626]" />
          <span className="flex-1">
            <span className="block text-[15px] font-semibold text-[#B91C1C]">
              {t(pending === 1 ? "erp.sitDecisionNeeded" : "erp.sitDecisionNeededMany", { n: pending })}
            </span>
            <span className="block text-[12px] text-ink-3">
              {subject ? t("erp.sitPendingToday", { name: subject.name }) : t("erp.sitPendingGeneric")}
            </span>
          </span>
          <span className="text-[13px] font-medium text-cvd">{t("erp.sitSeeDecide")}</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-[#DCFCE7] px-4 py-3 dark:bg-emerald-950/50">
          <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
          <div>
            <div className="text-[15px] font-semibold text-[#166534]">{t("erp.sitNoneRequired")}</div>
            <div className="text-[12px] text-[#15803d]/80">{t("erp.sitNoneToday")}</div>
          </div>
        </div>
      )}

      <section className="erp-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
            <Target className="h-4 w-4 text-cvd" /> {t("erp.sitTop")}
          </h2>
          <Link href="/pipeline" className="text-[13px] font-medium text-cvd">
            {t("erp.sitSeePipeline")}
          </Link>
        </div>
        <table className="erp-table w-full">
          <thead>
            <tr>
              <th>{t("erp.sitRank")}</th>
              <th>{t("erp.sitStartup")}</th>
              <th>{t("erp.sitWhyNow")}</th>
              <th>{t("erp.status")}</th>
              <th>{t("erp.priorityScore")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.top.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-3">
                  {t("erp.sitEmpty")}
                </td>
              </tr>
            ) : (
              data.top.map((row) => (
                <tr
                  key={row.id}
                  className="erp-row-link"
                  onClick={() => router.push(`/pipeline/${row.id}`)}
                >
                  <td className="w-14">
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold",
                        row.rank === 1
                          ? "bg-cvd text-white"
                          : row.rank === 3
                            ? "bg-[#FFEDD5] text-[#c2410c] dark:bg-orange-950/70 dark:text-orange-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
                      )}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      <Mark name={row.name} className="h-7 w-7" />
                      {row.name}
                    </div>
                  </td>
                  <td>{L(row.why)}</td>
                  <td>
                    <StatusChip label={L(row.statusLabel.label)} tone={row.statusLabel.tone} />
                  </td>
                  <td>
                    <ScorePill score={row.score} />
                  </td>
                  <td className="w-8">
                    <Link href={`/pipeline/${row.id}`} className="text-ink-3">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {featured ? <FeaturedCard deal={featured} /> : null}

      {decisionOpen && subject ? (
        <DecisionModal
          name={subject.name}
          sector={subject.sector}
          description={subject.description}
          id={subject.id}
          onClose={() => setDecisionOpen(false)}
          onDone={() => {
            setDecisionOpen(false);
            setResolved(true);
          }}
        />
      ) : null}
    </div>
  );
}

function FeaturedCard({ deal }: { deal: NonNullable<SituationPayload["featured"]> }) {
  const { t, locale } = useLocale();
  const L = (s: string) => localizePhrase(locale, s);
  const icons = [
    { key: "arr", Icon: BarChart3, wrap: "bg-cvd-soft text-cvd" },
    { key: "churn", Icon: Percent, wrap: "bg-[#EDE9FE] text-[#7c3aed]" },
    { key: "touch", Icon: Calendar, wrap: "bg-[#EDE9FE] text-[#7c3aed]" },
  ];
  return (
    <section className="erp-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Mark name={deal.name} className="h-12 w-12 text-[18px]" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[20px] font-bold text-ink">{deal.name}</h3>
              {deal.sector ? <StatusChip label={deal.sector} tone="blue" /> : null}
            </div>
            <p className="max-w-xl text-[13px] text-ink-3">{deal.description || t("erp.sitPipelineFile")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/pipeline/${deal.id}`} className="text-[13px] font-medium text-cvd">
            {t("erp.sitSeeFull")}
          </Link>
          <button type="button" className="rounded-lg p-1 text-ink-3" aria-label={t("erp.sitMenu")}>
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {deal.kpis.map((k) => {
          const meta = icons.find((i) => i.key === k.key) ?? icons[2];
          const Icon = meta.Icon;
          return (
            <div key={k.label} className="rounded-xl bg-canvas px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", meta.wrap)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[11px] uppercase tracking-wide text-ink-3">{L(k.label)}</span>
              </div>
              <div className="mt-2 text-[20px] font-bold text-ink">{k.value}</div>
              {k.delta ? <div className="text-[12px] text-[#16A34A]">{k.delta}</div> : <div className="text-[12px] text-ink-3">{L(k.hint)}</div>}
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
            <FileText className="h-4 w-4 text-cvd" /> {t("erp.sitCurrent")}
          </h4>
          <ul className="space-y-1.5 text-[13px] text-ink-2">
            {deal.bullets.length ? deal.bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cvd" />
                <NoteText text={b} />
              </li>
            )) : <li className="text-ink-3">{t("erp.sitNoNotes")}</li>}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
            <ListChecks className="h-4 w-4 text-cvd" /> {t("erp.sitNextAction")}
          </h4>
          <ul className="space-y-2 text-[13px]">
            {deal.actions.map((a) => (
              <li key={a.label} className="flex items-start justify-between gap-2">
                <span className="flex gap-2 text-ink-2">
                  <span className="mt-0.5 h-3.5 w-3.5 rounded-full border border-line" />
                  {L(a.label)}
                </span>
                <span className={cn("shrink-0 text-[12px]", a.due === "À planifier" ? "text-[#DC2626]" : "text-cvd")}>{L(a.due)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
            <CircleHelp className="h-4 w-4 text-cvd" /> {t("erp.sitQuestions")}
          </h4>
          <ol className="space-y-1.5 text-[13px] text-ink-2">
            {deal.questions.map((q, i) => (
              <li key={q}>
                {i + 1}. {L(q)}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function DecisionModal({
  id,
  name,
  sector,
  description,
  onClose,
  onDone,
}: {
  id: string;
  name: string;
  sector: string | null;
  description: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (gpDecision: "Invest" | "Watch" | "Pass") => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id, gpDecision }] }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("erp.sitSaveFail"));
      toast.error(t("erp.sitSaveFailToast"));
      return;
    }
    toast.success(gpDecision === "Invest" ? t("erp.sitInvestOk") : gpDecision === "Watch" ? t("erp.sitWatchOk") : t("erp.sitPassOk"));
    onDone();
    router.refresh();
  };

  return (
    <ErpOverlay onClose={onClose} panelClassName="max-w-md">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#DC2626]">
            <AlertCircle className="h-4 w-4" /> {t("erp.sitDecideTitle")}
          </div>
          <button type="button" onClick={onClose} className="text-ink-3">×</button>
        </div>
        <div className="mb-3 flex items-center gap-3">
          <Mark name={name} />
          <div>
            <div className="font-semibold">{name}</div>
            <div className="text-[12px] text-ink-3">{sector || t("erp.sitStartup")} · {clipText(description, 72) || t("erp.sitPipelineFile")}</div>
          </div>
        </div>
        <p className="text-[14px] text-ink-2">{t("erp.sitDecideBody")}</p>
        {error ? <p className="mt-2 text-[12px] text-[#DC2626]">{error}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push(`/pipeline/${id}`)}>{t("erp.sitSeeRecord")}</Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => decide("Pass")}>{t("erp.sitDoNotInvest")}</Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => decide("Watch")}>{t("erp.sitWatch")}</Button>
          <Button size="sm" disabled={busy} onClick={() => decide("Invest")}>{t("erp.sitInvest")}</Button>
        </div>
    </ErpOverlay>
  );
}
