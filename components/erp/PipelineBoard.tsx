"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileText, Heart, Layers, Plus, Search, Users } from "lucide-react";
import { FUNNEL } from "@/lib/erp/model";
import { PageHeader, StatCard } from "@/components/erp/ui";
import { Button } from "@/components/ui/Button";
import { NewOpportunityModal } from "@/components/erp/NewOpportunityModal";
import { PipelineTable } from "@/components/erp/PipelineTable";
import { useLocale } from "@/lib/i18n";
import type { PipelinePayload } from "@/lib/erp/payloads";

export function PipelineBoard({ data }: { data: PipelinePayload }) {
  const { t } = useLocale();
  const stageT: Record<string, string> = {
    sourcing: "erp.stageSourcing",
    diligence: "erp.stageDiligence",
    ic: "erp.stageIc",
    negotiation: "erp.stageNegotiation",
    closed: "erp.stageClosed",
  };
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [sector, setSector] = useState("all");
  const [geo, setGeo] = useState("all");
  const [open, setOpen] = useState(false);

  const sectors = useMemo(() => [...new Set(data.rows.map((r) => r.sector).filter(Boolean))] as string[], [data.rows]);
  const geos = useMemo(() => [...new Set(data.rows.map((r) => r.country).filter(Boolean))] as string[], [data.rows]);

  const filtered = useMemo(() => {
    return data.rows.filter((r) => {
      if (stage !== "all" && r.stage !== stage) return false;
      if (sector !== "all" && r.sector !== sector) return false;
      if (geo !== "all" && r.country !== geo) return false;
      if (!q.trim()) return true;
      return [r.name, r.sector, r.country, r.description].join(" ").toLowerCase().includes(q.trim().toLowerCase());
    });
  }, [data.rows, q, stage, sector, geo]);

  const reset = () => {
    setQ("");
    setStage("all");
    setSector("all");
    setGeo("all");
  };

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={t("erp.pipeTitle")}
        subtitle={t("erp.pipeSubtitle")}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("erp.pipeAdd")}
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <button type="button" onClick={() => setStage("all")}>
          <StatCard icon={<Layers className="h-4 w-4" />} value={String(data.total)} label={t("erp.pipeTotal")} selected={stage === "all"} />
        </button>
        <button type="button" onClick={() => setStage("sourcing")}>
          <StatCard icon={<Search className="h-4 w-4" />} value={String(data.counts.sourcing ?? 0)} label={t("erp.stageSourcing")} selected={stage === "sourcing"} />
        </button>
        <button type="button" onClick={() => setStage("diligence")}>
          <StatCard icon={<FileText className="h-4 w-4" />} value={String(data.counts.diligence ?? 0)} label={t("erp.stageDiligence")} selected={stage === "diligence"} />
        </button>
        <button type="button" onClick={() => setStage("ic")}>
          <StatCard icon={<Users className="h-4 w-4" />} value={String(data.counts.ic ?? 0)} label={t("erp.stageIc")} selected={stage === "ic"} iconClass="bg-[#EDE9FE] text-[#7c3aed]" />
        </button>
        <button type="button" onClick={() => setStage("negotiation")}>
          <StatCard icon={<Heart className="h-4 w-4" />} value={String(data.counts.negotiation ?? 0)} label={t("erp.stageNegotiation")} selected={stage === "negotiation"} iconClass="bg-[#FEE2E2] text-[#DC2626]" />
        </button>
        <button type="button" onClick={() => setStage("closed")}>
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} value={String(data.counts.closed ?? 0)} label={t("erp.stageClosed")} selected={stage === "closed"} iconClass="bg-[#DCFCE7] text-[#16A34A]" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[13px]">
          <Search className="h-4 w-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("erp.pipeSearch")} className="w-full outline-none" />
        </div>
        <select className="h-9 rounded-lg border border-line bg-surface px-2 text-[13px]" value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="all">{t("erp.sectorAll")}</option>
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="h-9 rounded-lg border border-line bg-surface px-2 text-[13px]" value={geo} onChange={(e) => setGeo(e.target.value)}>
          <option value="all">{t("erp.geoAll")}</option>
          {geos.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="h-9 rounded-lg border border-line bg-surface px-2 text-[13px]" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="all">{t("erp.stageAll")}</option>
          {FUNNEL.map((f) => (
            <option key={f.id} value={f.id}>
              {t(stageT[f.id] || "erp.stageSourcing")}
            </option>
          ))}
        </select>
        <select className="h-9 rounded-lg border border-line bg-surface px-2 text-[13px]" defaultValue="all">
          <option value="all">{t("erp.statusAll")}</option>
        </select>
        <select className="h-9 rounded-lg border border-line bg-surface px-2 text-[13px]" defaultValue="all">
          <option value="all">{t("erp.assignedTo")}</option>
        </select>
        <button type="button" onClick={reset} className="text-[13px] text-cvd">
          {t("erp.reset")}
        </button>
      </div>

      <PipelineTable rows={filtered} />
      {open ? <NewOpportunityModal onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
