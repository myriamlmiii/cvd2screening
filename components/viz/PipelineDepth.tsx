"use client";

import { cn } from "@/lib/utils";

export function PipelineDepth({
  stages,
  onSelect,
}: {
  stages: { label: string; count: number }[];
  onSelect?: (label: string) => void;
}) {
  const total = stages.reduce((s, x) => s + x.count, 0) || 1;
  return (
    <div className="pipeline-depth" role="list">
      {stages.slice(0, 6).map((stage, i) => (
        <button
          key={stage.label}
          type="button"
          role="listitem"
          onClick={() => onSelect?.(stage.label)}
          className={cn("pipeline-depth__layer")}
          style={{ "--z": `${12 - i * 2}px`, "--i": String(i) } as React.CSSProperties}
        >
          <span className="min-w-0 truncate text-[10px] font-semibold">{stage.label}</span>
          <span className="font-mono text-[11px] font-semibold">{stage.count}</span>
          <span className="text-[9px] text-ink-3">{Math.round((stage.count / total) * 100)}%</span>
        </button>
      ))}
    </div>
  );
}
