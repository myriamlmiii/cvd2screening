"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Calendar, ChevronRight, Clock, PieChart, Plus, Search, Users } from "lucide-react";
import { Cell, Pie, PieChart as RPie, ResponsiveContainer } from "recharts";
import { Mark, PageHeader, StatCard, StatusChip } from "@/components/erp/ui";
import { Button } from "@/components/ui/Button";
import { ErpOverlay } from "@/components/erp/Overlay";
import { useLocale } from "@/lib/i18n";
import { localizePhrase } from "@/lib/erp/labels";
import type { TasksPayload } from "@/lib/erp/payloads";

const PILL: Record<string, "red" | "amber" | "green" | "blue" | "violet"> = {
  Haute: "red",
  Moyenne: "amber",
  Basse: "green",
  "À décider": "amber",
  "En cours": "blue",
  "À valider": "violet",
  "À faire": "blue",
  Bloquée: "red",
};

export function TasksBoard({ data }: { data: TasksPayload }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const L = (s: string) => localizePhrase(locale, s);
  const [tab, setTab] = useState<"mine" | "team">("team");
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [startup, setStartup] = useState("all");
  const [focus, setFocus] = useState<"all" | "urgent" | "late" | "ic">("all");
  const [note, setNote] = useState(false);

  const startups = useMemo(() => [...new Set(data.tasks.map((x) => x.startup))], [data.tasks]);

  const rows = useMemo(() => {
    return data.tasks.filter((task) => {
      if (tab === "mine" && task.role !== "GP") return false;
      if (priority !== "all" && task.priorite !== priority) return false;
      if (status !== "all" && task.statut !== status) return false;
      if (startup !== "all" && task.startup !== startup) return false;
      if (focus === "urgent" && task.tone !== "red") return false;
      if (focus === "late" && task.tone !== "red") return false;
      if (focus === "ic" && task.statut !== "À valider") return false;
      if (!q.trim()) return true;
      return `${task.title} ${task.startup}`.toLowerCase().includes(q.trim().toLowerCase());
    });
  }, [data.tasks, q, tab, priority, status, startup, focus]);

  const byStatus = [
    { label: "À faire", n: data.tasks.filter((x) => x.statut === "À faire").length },
    { label: "En cours", n: data.tasks.filter((x) => x.statut === "En cours").length },
    { label: "À valider", n: data.tasks.filter((x) => x.statut === "À valider").length },
    { label: "À décider", n: data.tasks.filter((x) => x.statut === "À décider").length },
    { label: "Bloquées", n: data.tasks.filter((x) => x.statut === "Bloquée").length },
  ];
  const COLORS = ["#64748b", "#2563EB", "#7c3aed", "#D97706", "#DC2626"];

  const reset = () => {
    setQ("");
    setPriority("all");
    setStatus("all");
    setStartup("all");
    setFocus("all");
    setTab("team");
  };

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={t("erp.tasksTitle")}
        subtitle={t("erp.tasksSubtitle")}
        action={
          <Button onClick={() => setNote(true)}>
            <Plus className="h-4 w-4" /> {t("erp.tasksCreate")}
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-4">
        <button type="button" onClick={() => setFocus("all")}>
          <StatCard icon={<Calendar className="h-4 w-4" />} value={String(data.open)} label={t("erp.tasksOpen")} selected={focus === "all"} />
        </button>
        <button type="button" onClick={() => setFocus("urgent")}>
          <StatCard icon={<AlertTriangle className="h-4 w-4" />} value={String(data.urgent)} label={t("erp.tasksUrgent")} selected={focus === "urgent"} iconClass="bg-[#FEE2E2] text-[#DC2626]" />
        </button>
        <button type="button" onClick={() => setFocus("late")}>
          <StatCard icon={<Clock className="h-4 w-4" />} value={String(data.late)} label={t("erp.tasksLate")} selected={focus === "late"} iconClass="bg-[#FEF3C7] text-[#D97706]" />
        </button>
        <button type="button" onClick={() => setFocus("ic")}>
          <StatCard icon={<Users className="h-4 w-4" />} value={String(data.ic)} label={t("erp.tasksIc")} selected={focus === "ic"} iconClass="bg-[#EDE9FE] text-[#7c3aed]" />
        </button>
      </div>
      <div className="flex gap-1 rounded-lg bg-[#F5F7FA] p-1 text-[13px]">
        <button type="button" onClick={() => setTab("mine")} className={`rounded-md px-3 py-1.5 ${tab === "mine" ? "bg-white font-medium shadow-sm" : "text-ink-3"}`}>
          {t("erp.tasksMine")}
        </button>
        <button type="button" onClick={() => setTab("team")} className={`rounded-md px-3 py-1.5 ${tab === "team" ? "bg-white font-medium shadow-sm" : "text-ink-3"}`}>
          {t("erp.tasksTeam")}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px]">
          <Search className="h-4 w-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("erp.tasksSearch")} className="w-full outline-none" />
        </div>
        <select className="h-9 rounded-lg border border-line px-2 text-[13px]" value={startup} onChange={(e) => setStartup(e.target.value)}>
          <option value="all">{t("erp.startupAll")}</option>
          {startups.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="h-9 rounded-lg border border-line px-2 text-[13px]" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="all">{t("erp.priorityAll")}</option>
          <option value="Haute">{t("erp.todo") === "To do" ? "High" : "Haute"}</option>
          <option value="Moyenne">{locale === "en" ? "Medium" : "Moyenne"}</option>
          <option value="Basse">{locale === "en" ? "Low" : "Basse"}</option>
        </select>
        <select className="h-9 rounded-lg border border-line px-2 text-[13px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">{t("erp.statusAll")}</option>
          <option value="À faire">{t("erp.todo")}</option>
          <option value="En cours">{t("erp.inProgress")}</option>
          <option value="À valider">{t("erp.toValidate")}</option>
        </select>
        <button type="button" className="text-[13px] text-[#2563EB]" onClick={reset}>
          {t("erp.reset")}
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="erp-card overflow-hidden">
          <table className="erp-table w-full">
            <thead>
              <tr>
                <th className="w-8">
                  <input type="checkbox" className="accent-[#2563EB]" aria-label={t("erp.all")} />
                </th>
                <th>{t("erp.tasksCol")}</th>
                <th>{t("erp.sitStartup")}</th>
                <th>{t("erp.tasksPriority")}</th>
                <th>{t("erp.tasksDue")}</th>
                <th>{t("erp.status")}</th>
                <th>{t("erp.tasksAssignee")}</th>
                <th>{t("erp.tasksRole")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-ink-3">
                    {t("erp.tasksEmpty")}
                  </td>
                </tr>
              ) : (
                rows.map((task) => (
                  <tr key={task.id} className="erp-row-link" onClick={() => router.push(`/pipeline/${task.startupId}`)}>
                    <td>
                      <input type="checkbox" className="accent-[#2563EB]" aria-label={task.title} onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="font-medium text-ink">{L(task.title)}</td>
                    <td>
                      <Link href={`/pipeline/${task.startupId}`} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Mark name={task.startup} className="h-6 w-6 text-[10px]" />
                        {task.startup}
                      </Link>
                    </td>
                    <td>
                      <StatusChip label={L(task.priorite)} tone={PILL[task.priorite]} />
                    </td>
                    <td>{L(task.echeance)}</td>
                    <td>
                      <StatusChip label={L(task.statut)} tone={PILL[task.statut] || "slate"} />
                    </td>
                    <td>{L(task.assignee)}</td>
                    <td>{task.role}</td>
                    <td>
                      <ChevronRight className="h-4 w-4 text-ink-3" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
        <aside className="space-y-4">
          <div className="erp-card p-4">
            <h3 className="mb-2 text-[13px] font-semibold">{t("erp.tasksLoad")}</h3>
            <p className="mb-2 text-[12px] text-ink-3">{t("erp.tasksLoadHint")}</p>
            <div className="flex items-start gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-[12px] font-bold text-slate-600">?</span>
              <div>
                <div className="text-[13px] font-semibold">{t("erp.unassigned")}</div>
                <div className="text-[11px] text-ink-3">{t("erp.tasksSharedQueue")}</div>
                <div className="text-[12px] text-[#DC2626]">{t("erp.tasksCritical", { n: data.urgent })}</div>
                <div className="text-[12px] text-ink-2">{t("erp.tasksOpenCount", { n: data.unassigned ?? data.open })}</div>
              </div>
            </div>
          </div>
          <div className="erp-card p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
              <PieChart className="h-4 w-4" /> {t("erp.tasksByStatus")}
            </h3>
            <div className="h-40">
              <ResponsiveContainer>
                <RPie>
                  <Pie data={byStatus} dataKey="n" nameKey="label" innerRadius={40} outerRadius={62}>
                    {byStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </RPie>
              </ResponsiveContainer>
            </div>
            <ul className="mt-1 space-y-1 text-[12px]">
              {byStatus.map((s, i) => (
                <li key={s.label}>
                  <button type="button" className="flex items-center gap-2" onClick={() => setStatus(s.label === "Bloquées" ? "Bloquée" : s.label)}>
                    <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} /> {L(s.label)} · {s.n}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="erp-card p-4 text-[13px]">
            <h3 className="mb-2 font-semibold">{t("erp.tasksQuick")}</h3>
            <ul className="space-y-1 text-[#2563EB]">
              <li>
                <button type="button" onClick={() => setTab("mine")}>
                  {t("erp.tasksSeeMine")}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setFocus("late")}>
                  {t("erp.tasksSeeLate")}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setFocus("ic")}>
                  {t("erp.tasksSeeIc")}
                </button>
              </li>
            </ul>
          </div>
        </aside>
      </div>
      {note ? (
        <ErpOverlay onClose={() => setNote(false)} panelClassName="max-w-md">
            <h2 className="text-[16px] font-semibold">{t("erp.tasksCreateTitle")}</h2>
            <p className="mt-2 text-[13px] text-ink-2">{t("erp.tasksCreateHint")}</p>
            <Button className="mt-4" onClick={() => setNote(false)}>
              {t("erp.relGotIt")}
            </Button>
        </ErpOverlay>
      ) : null}
    </div>
  );
}
