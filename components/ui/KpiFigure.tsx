"use client";

import { TiltCard } from "@/components/ui/TiltCard";
import { Sparkline } from "@/components/charts/Sparkline";
import { cn } from "@/lib/utils";

export function KpiFigure({
  label,
  value,
  hint,
  series,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint?: string;
  series: number[];
  tone?: "ink" | "bronze" | "green";
}) {
  const color = tone === "bronze" ? "#c4a57a" : tone === "green" ? "var(--positive)" : "var(--ink)";
  return (
    <TiltCard className="tpl-panel p-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-3">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div
          className={cn("kpi-figure font-display text-[40px] font-semibold leading-none tracking-tight")}
          style={{ color }}
        >
          {value}
        </div>
        <Sparkline values={series} color={color} />
      </div>
      {hint ? <div className="mt-2 text-[12px] text-positive">{hint}</div> : null}
    </TiltCard>
  );
}
