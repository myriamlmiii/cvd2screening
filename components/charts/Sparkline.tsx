"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** Tiny trend line for the Overview stat cards — no axes, no tooltip, just
    a shape. `null` entries (a month with no scored deals, say) are gaps. */
export function Sparkline({ values, color = "var(--cvd)" }: { values: (number | null)[]; color?: string }) {
  const data = values.map((v, i) => ({ i, v }));
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="h-5 w-12 shrink-0">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gid})`}
            isAnimationActive={false}
            connectNulls
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
