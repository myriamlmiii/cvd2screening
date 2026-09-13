"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type LandscapePoint = {
  id: string;
  name: string;
  score: number | null;
  completeness: number;
  rec: string;
};

export function ScreeningLandscape({ points }: { points: LandscapePoint[] }) {
  const { t } = useLocale();
  const router = useRouter();
  const plotted = points.filter((p) => p.score != null);

  return (
    <div>
      <div className="mb-0.5 text-[11px] font-medium">{t("pages.screeningLandscape")}</div>
      <p className="mb-2 text-[10px] text-ink-3">{t("pages.landscapeHint")}</p>
      {plotted.length === 0 ? (
        <p className="py-6 text-center text-[11px] text-ink-3">{t("pages.noAi")}</p>
      ) : (
        <svg viewBox="0 0 320 168" className="h-[170px] w-full text-ink" role="img" aria-label={t("pages.screeningLandscape")}>
          <line x1="28" y1="152" x2="308" y2="152" stroke="currentColor" strokeOpacity="0.12" />
          <line x1="28" y1="16" x2="28" y2="152" stroke="currentColor" strokeOpacity="0.12" />
          <text x="28" y="164" fontSize="8" fill="currentColor" opacity="0.45">
            0
          </text>
          <text x="292" y="164" fontSize="8" fill="currentColor" opacity="0.45">
            100
          </text>
          <text x="4" y="20" fontSize="8" fill="currentColor" opacity="0.45">
            100
          </text>
          {plotted.map((p) => {
            const x = 28 + ((p.score ?? 0) / 100) * 280;
            const y = 152 - (p.completeness / 100) * 136;
            const r = p.rec === "Strong Fit" ? 4.2 : 3.2;
            return (
              <circle
                key={p.id}
                cx={x}
                cy={y}
                r={r}
                className={cn("cursor-pointer motion-safe:transition-opacity")}
                fill={p.rec === "Strong Fit" ? "#c4a57a" : "currentColor"}
                fillOpacity={p.rec === "Strong Fit" ? 0.9 : 0.28}
                onClick={() => router.push(`/review?id=${encodeURIComponent(p.id)}`)}
              >
                <title>{`${p.name} · ${p.score} · ${p.completeness}%`}</title>
              </circle>
            );
          })}
        </svg>
      )}
    </div>
  );
}
