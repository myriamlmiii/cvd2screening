import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { avatarTone, initials } from "@/lib/erp/model";
import { formatCountry } from "@/lib/erp/display";

export function Mark({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[12px] font-bold text-white", className)}
      style={{ background: avatarTone(name) }}
    >
      {initials(name).slice(0, 1)}
    </span>
  );
}

export function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "blue" | "amber" | "violet" | "slate" | "red" | "pink";
}) {
  const map = {
    green: "bg-[#DCFCE7] text-[#15803d]",
    blue: "bg-[#DBEAFE] text-[#1d4ed8]",
    amber: "bg-[#FEF3C7] text-[#b45309]",
    violet: "bg-[#EDE9FE] text-[#6d28d9]",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-[#FEE2E2] text-[#b91c1c]",
    pink: "bg-[#FCE7F3] text-[#be185d]",
  };
  return <span className={cn("erp-chip", map[tone])}>{label}</span>;
}

export function ScorePill({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-ink-3">—</span>;
  const tone = score >= 80 ? "bg-[#DCFCE7] text-[#15803d]" : score >= 60 ? "bg-[#FEF3C7] text-[#b45309]" : "bg-[#FEE2E2] text-[#b91c1c]";
  return <span className={cn("inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-[13px] font-bold", tone)}>{score}</span>;
}

export function StatCard({
  icon,
  value,
  label,
  hint,
  selected,
  iconClass = "bg-[#DBEAFE] text-[#2563EB]",
}: {
  icon: ReactNode;
  value: string;
  label: string;
  hint?: string;
  selected?: boolean;
  iconClass?: string;
}) {
  return (
    <div className={cn("erp-card flex items-center gap-3 px-4 py-3 transition", selected && "ring-2 ring-[#2563EB]")}>
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", iconClass)}>{icon}</span>
      <div>
        <div className="text-[20px] font-bold leading-tight text-ink">{value}</div>
        <div className="text-[12px] text-ink-3">{label}</div>
        {hint ? <div className="text-[11px] text-[#16A34A]">{hint}</div> : null}
      </div>
    </div>
  );
}

export function CountryCell({ country }: { country: string | null | undefined }) {
  const { code, name } = formatCountry(country);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {code ? (
        // PNG flags: Windows 10 does not render emoji regional-indicator "flags" (shows FR + France).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://flagcdn.com/16x12/${code}.png`} width={16} height={12} alt="" className="inline-block rounded-[1px]" />
      ) : null}
      <span>{name}</span>
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#1B2B44]">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
