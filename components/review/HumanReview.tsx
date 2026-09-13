"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { HumanDecision } from "@/types";

const TAGS = ["Thesis fit", "Traction", "Team", "Market", "Product", "Risk", "Missing information", "Competitive position", "Other"] as const;

export function HumanReview({
  busy,
  aiSuggests,
  onConfirm,
}: {
  busy: boolean;
  aiSuggests: HumanDecision | null;
  onConfirm: (input: { decision: HumanDecision; rationale: string; tags: string[] }) => void;
}) {
  const { t } = useLocale();
  const [decision, setDecision] = useState<HumanDecision | null>(null);
  const [reason, setReason] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const ready = Boolean(decision && reason.trim().length >= 3 && !busy);

  return (
    <div className="mt-3 border-t border-line pt-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">{t("pages.humanReview")}</div>
      {aiSuggests ? (
        <p className="mt-1 text-[11px] text-ink-2">
          {t("pages.aiSuggests")}: <span className="font-semibold text-ink">{aiSuggests}</span>
          <span className="text-ink-3"> — {t("pages.aiNotDecision")}</span>
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-ink-3">{t("pages.noAi")}</p>
      )}
      <div className="mt-2 grid grid-cols-3 gap-1">
        {(["Invest", "Watch", "Pass"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setDecision(id)}
            className={cn(
              "h-7 rounded-md text-[10px] font-semibold",
              decision === id ? "bg-[#c4a57a] text-[#1a1c18]" : "border border-line text-ink",
            )}
          >
            {id === "Invest" ? t("pages.invest") : id === "Watch" ? t("pages.watch") : t("pages.pass")}
          </button>
        ))}
      </div>
      <label className="mt-2 block text-[10px] font-semibold">
        {t("pages.primaryReason")}
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-0.5 h-7 w-full rounded-md border border-line bg-surface px-2 text-[11px] font-medium outline-none"
        />
      </label>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {TAGS.map((tag) => {
          const on = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== tag) : [...cur, tag]))}
              className={cn("rounded border px-1.5 py-0.5 text-[10px]", on ? "border-line bg-surface-2 font-semibold" : "border-line text-ink-3")}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={() => {
          if (!decision) return;
          onConfirm({ decision, rationale: reason.trim(), tags });
          setDecision(null);
          setReason("");
          setTags([]);
        }}
        className="mt-2 h-7 w-full rounded-md border border-line text-[11px] font-semibold disabled:opacity-40"
      >
        {t("pages.confirmDecision")}
      </button>
    </div>
  );
}
