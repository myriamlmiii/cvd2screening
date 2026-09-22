"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addDays, startOfWeek } from "@/lib/erp/model";
import { Button } from "@/components/ui/Button";
import { ErpOverlay } from "@/components/erp/Overlay";
import { PageHeader } from "@/components/erp/ui";
import { useLocale } from "@/lib/i18n";
import { formatAppDate } from "@/lib/dates";
import type { AgendaPayload } from "@/lib/erp/payloads";
import { cn } from "@/lib/utils";

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const TAB_KEYS = ["erp.agendaCal", "erp.agendaList", "erp.agendaMine", "erp.agendaTeam", "erp.agendaMilestones"] as const;
const KINDS: Record<string, { cls: string; label: string }> = {
  pipeline: { cls: "bg-sky-100 text-sky-800", label: "Call fondateur" },
  portfolio: { cls: "bg-violet-100 text-violet-800", label: "Suivi portefeuille" },
  diligence: { cls: "bg-amber-100 text-amber-800", label: "Due diligence" },
  ic: { cls: "bg-red-100 text-red-800", label: "Comité d'investissement" },
  task: { cls: "bg-emerald-100 text-emerald-800", label: "Réunion interne" },
};

export function AgendaBoard({ data }: { data: AgendaPayload }) {
  const { t, locale } = useLocale();
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState<string>("erp.agendaCal");
  const [view, setView] = useState<"week" | "list">("week");
  const [note, setNote] = useState(false);
  const monday = useMemo(() => addDays(startOfWeek(new Date()), offset * 7), [offset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const today = new Date().toISOString().slice(0, 10);
  const events = useMemo(() => {
    if (tab === "erp.agendaMine") return data.events.filter((e) => e.kind === "pipeline" || e.kind === "task");
    if (tab === "erp.agendaMilestones") return data.events.filter((e) => e.kind === "ic" || e.kind === "portfolio");
    return data.events;
  }, [data.events, tab]);
  const byDay = (iso: string) => events.filter((e) => e.date === iso);
  const showList = view === "list" || tab === "erp.agendaList" || tab === "erp.agendaMine" || tab === "erp.agendaTeam" || tab === "erp.agendaMilestones";

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={t("erp.agendaTitle")}
        subtitle={t("erp.agendaSubtitle")}
        action={<Button onClick={() => setNote(true)}><Plus className="h-4 w-4" /> {t("erp.agendaAdd")}</Button>}
      />
      <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-1 text-[13px]">
        {TAB_KEYS.map((key) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-md px-3 py-1.5 ${tab === key ? "bg-surface font-medium shadow-sm" : "text-ink-3"}`}>
            {t(key)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOffset(0)}>{t("erp.today")}</Button>
        <button type="button" onClick={() => setOffset((n) => n - 1)} className="rounded-lg p-1 hover:bg-surface-2"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => setOffset((n) => n + 1)} className="rounded-lg p-1 hover:bg-surface-2"><ChevronRight className="h-4 w-4" /></button>
        <div className="text-[14px] font-semibold">
          {t("erp.agendaWeekOf", { from: formatAppDate(monday.toISOString(), locale), to: formatAppDate(addDays(monday, 6).toISOString(), locale) })}
        </div>
        <div className="ml-auto flex rounded-lg border border-line text-[12px]">
          <button type="button" onClick={() => { setView("week"); setTab("erp.agendaCal"); }} className={cn("px-3 py-1.5", view === "week" && tab === "erp.agendaCal" ? "bg-cvd text-white" : "text-ink-3")}>{t("erp.week")}</button>
          <button type="button" onClick={() => setView("list")} className={cn("px-3 py-1.5", view === "list" || showList ? "bg-cvd text-white" : "text-ink-3")}>{t("erp.agendaList")}</button>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <section className="erp-card overflow-hidden">
          {showList ? (
            <table className="erp-table w-full">
              <thead>
                <tr>
                  <th>{t("erp.agendaWhen")}</th>
                  <th>{t("erp.agendaKind")}</th>
                  <th>{t("erp.sitStartup")}</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-ink-3">{t("erp.agendaEmpty")}</td></tr>
                ) : (
                  [...events].sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
                    <tr key={e.id}>
                      <td>{formatAppDate(e.date, locale)}</td>
                      <td><span className={cn("rounded-md px-1.5 py-0.5 text-[12px]", KINDS[e.kind]?.cls)}>{t(e.kind === "pipeline" ? "erp.agendaFounderCall" : e.kind === "portfolio" ? "erp.agendaPortFollow" : e.kind === "diligence" ? "erp.agendaDd" : e.kind === "ic" ? "erp.agendaIc" : "erp.agendaInternal")}</span></td>
                      <td><Link href={`/pipeline/${e.startupId}`} className="text-cvd">{e.title}</Link></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <>
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-line bg-[#F8FAFC] text-center text-[12px]">
            <div />
            {days.map((d) => {
              const key = d.toISOString().slice(0, 10);
              return (
                <div key={key} className={cn("border-l border-line py-2", key === today && "bg-cvd-soft font-semibold")}>
                  <div className="text-ink-3">{d.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { weekday: "short" })}</div>
                  <div className="text-[16px]">{d.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-line text-[11px]">
            <div className="px-1 py-2 text-ink-3">{t("erp.agendaAllDay")}</div>
            {days.map((d) => {
              const key = d.toISOString().slice(0, 10);
              return (
                <div key={key} className="min-h-[52px] space-y-1 border-l border-line p-1">
                  {byDay(key).map((e) => (
                    <Link key={e.id} href={`/pipeline/${e.startupId}`} className={cn("block rounded-md px-1.5 py-1 font-medium", KINDS[e.kind]?.cls)}>
                      {e.title}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="max-h-[480px] overflow-auto">
            {HOURS.map((h) => (
              <div key={h} className="grid grid-cols-[56px_repeat(7,1fr)] border-t border-line">
                <div className="px-1 py-3 text-[11px] text-ink-3">{String(h).padStart(2, "0")}:00</div>
                {days.map((d) => (
                  <div key={d.toISOString() + h} className="min-h-[44px] border-l border-line" />
                ))}
              </div>
            ))}
          </div>
          <p className="px-4 py-2 text-[11px] text-ink-3">{t("erp.agendaNoTime")}</p>
          <div className="flex flex-wrap gap-3 border-t border-line px-4 py-2 text-[11px] text-ink-3">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-sky-400" /> {t("erp.agendaFounderCall")}</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-400" /> {t("erp.agendaInternal")}</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-400" /> {t("erp.agendaDd")}</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red-400" /> {t("erp.agendaIc")}</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-violet-400" /> {t("erp.agendaPortFollow")}</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-slate-400" /> {t("erp.other")}</span>
          </div>
            </>
          )}
        </section>
        <aside className="space-y-4">
          <div className="erp-card p-4">
            <h3 className="mb-3 text-[13px] font-semibold">{t("erp.agendaUpcoming")}</h3>
            <ul className="space-y-2 text-[13px]">
              {data.upcoming.length === 0 ? <li className="text-ink-3">{t("erp.agendaNone")}</li> : data.upcoming.map((e) => (
                <li key={e.id} className="flex gap-2">
                  <span className="w-12 text-[11px] font-bold uppercase text-cvd">{formatAppDate(e.date, locale)}</span>
                  <Link href={`/pipeline/${e.startupId}`} className="flex-1 hover:text-cvd">{e.title}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="erp-card p-4 text-[13px]">
            <h3 className="mb-2 font-semibold">{t("erp.agendaMyCals")}</h3>
            <ul className="space-y-1 text-ink-2">
              {[t("erp.agendaMineDriss"), t("erp.agendaTeamCal"), t("erp.agendaFounderCalls"), t("erp.agendaDd"), t("erp.agendaIcCal"), t("erp.agendaEco")].map((l) => (
                <li key={l}><label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="accent-cvd" /> {l}</label></li>
              ))}
            </ul>
          </div>
          <div className="erp-card p-4 text-[13px]">
            <h3 className="mb-2 font-semibold">{t("erp.agendaQuick")}</h3>
            <ul className="space-y-1 text-cvd">
              <li><Link href="/relations">{t("erp.agendaPlanCall")}</Link></li>
              <li><Link href="/tasks">{t("erp.agendaPlanIc")}</Link></li>
              <li><Link href="/pipeline">{t("erp.agendaAddMilestone")}</Link></li>
              <li><Link href="/tasks">{t("erp.agendaLinkedTasks")}</Link></li>
            </ul>
          </div>
        </aside>
      </div>
      {note ? (
        <ErpOverlay onClose={() => setNote(false)} panelClassName="max-w-md">
            <h2 className="text-[16px] font-semibold">{t("erp.agendaAddTitle")}</h2>
            <p className="mt-2 text-[13px] text-ink-2">{t("erp.agendaNoCal")}</p>
            <Button className="mt-4" onClick={() => setNote(false)}>{t("erp.relGotIt")}</Button>
        </ErpOverlay>
      ) : null}
    </div>
  );
}
