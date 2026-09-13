"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { AxisKey, ScoreAxis } from "@/types";
import { AXIS_SHORT } from "@/lib/deal-view";

type Point = { axis: string; score: number };

function normalize(axes: ScoreAxis[] | Point[]): Point[] {
  if (!axes.length) return [];
  if ("axis" in axes[0]) return axes as Point[];
  return (axes as ScoreAxis[]).map((a) => ({
    axis: AXIS_SHORT[a.key as AxisKey] ?? a.key,
    score: a.score,
  }));
}

export function ScoreRadar({
  axes,
  size = 140,
  fill = "var(--bronze)",
  stroke = "var(--bronze)",
}: {
  axes: ScoreAxis[] | Point[];
  size?: number;
  fill?: string;
  stroke?: string;
}) {
  const data = normalize(axes);

  return (
    <div style={{ width: "100%", height: size }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="70%" cx="50%" cy="52%">
          <PolarGrid stroke="var(--line-strong)" gridType="polygon" strokeDasharray="0" radialLines />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--ink)", fontSize: 9, fontWeight: 600 }} />
          <Radar dataKey="score" stroke={stroke} fill={fill} fillOpacity={0.35} strokeWidth={1.6} isAnimationActive={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
