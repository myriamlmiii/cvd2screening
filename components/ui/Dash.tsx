"use client";

import { cn } from "@/lib/utils";

export function DealAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      title={name}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#c4a57a]/50 bg-surface-2 text-[11px] font-semibold text-[#8a6a3a] dark:bg-[#1a1e24] dark:text-[#c4a57a]",
        className,
      )}
    >
      U
    </div>
  );
}

export function DashCard({
  children,
  className,
  padded = true,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className={cn("tpl-panel", padded && "p-2.5", className)} onClick={onClick} role={onClick ? "button" : undefined}>
      {children}
    </div>
  );
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex h-7 min-w-[118px] items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-[11px] font-medium text-ink">
      {label ? <span className="shrink-0 text-ink">{label}</span> : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface text-ink outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface text-ink">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
