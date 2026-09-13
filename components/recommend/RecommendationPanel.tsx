"use client";

import { useEffect, useState } from "react";
import { DashCard } from "@/components/ui/Dash";
import { cn } from "@/lib/utils";
import type { ScoredDeal } from "@/types";
import type { IcMemo } from "@/lib/ic-memo";

const cache = new Map<string, IcMemo>();

export function RecommendationPanel({
  deal,
  auto = false,
  embedded = false,
}: {
  deal: ScoredDeal | null;
  auto?: boolean;
  embedded?: boolean;
}) {
  const [memo, setMemo] = useState<IcMemo | null>(deal ? cache.get(deal.id) ?? null : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = (target: ScoredDeal) => {
    const hit = cache.get(target.id);
    if (hit) {
      setMemo(hit);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: target.name,
        sector: target.sector,
        country: target.country,
        status: target.status,
        fundingSought: target.fundingSought,
        valuation: target.valuation,
        founder: target.founder,
        source: target.source,
        description: target.description,
        update: target.update,
        investors: target.investors,
      }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Recommendation unavailable.");
        return body as IcMemo;
      })
      .then((next) => {
        cache.set(target.id, next);
        setMemo(next);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!deal) {
      setMemo(null);
      return;
    }
    const hit = cache.get(deal.id);
    setMemo(hit ?? null);
    setError(null);
    if (auto && !hit) request(deal);
    // request is stable enough for this panel; keyed on deal id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id, auto]);

  const inner = !deal ? (
    <p className="text-[12px] font-medium text-ink">Select a company to draft a memo.</p>
  ) : (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">IC memo</div>
          {!embedded ? <div className="mt-1 font-sans text-[16px] font-semibold leading-tight text-ink">{deal.name}</div> : null}
        </div>
        {memo ? (
          <span
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
              memo.recommendation === "Strong Fit" && "bg-[#c4a57a] text-[#1a1c18]",
              (memo.recommendation === "Review" || memo.recommendation === "Needs Information") && "border border-line text-ink-2",
              memo.recommendation === "Watch" && "border border-line text-ink-2",
              memo.recommendation === "Lower Priority" && "bg-critical/15 text-critical",
            )}
          >
            {memo.recommendation}
          </span>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => request(deal)}
            className="h-6 rounded-md bg-[#c4a57a] px-2 text-[10px] font-semibold text-[#1a1c18] disabled:opacity-50"
          >
            {loading ? "Drafting…" : "Draft IC memo"}
          </button>
        )}
      </div>
      {loading && <p className="mt-2 text-[11px] text-ink-3">Drafting from the file on record…</p>}
      {error && <p className="mt-2 text-[11px] text-critical">{error}</p>}
      {memo && (
        <div className="mt-2 space-y-2">
          <p className="text-[12px] leading-relaxed text-ink-2">{memo.thesis}</p>
          <div className="text-[10px] uppercase tracking-wide text-ink-3">Conviction · {memo.conviction}</div>
          <ul className="space-y-1 text-[11px] text-ink-2">
            {memo.justification.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#c4a57a]" />
                {line}
              </li>
            ))}
          </ul>
          {memo.gaps.length > 0 && (
            <ul className="space-y-1 text-[11px] text-ink-3">
              {memo.gaps.map((g) => (
                <li key={g}>— {g}</li>
              ))}
            </ul>
          )}
          <div className="border-t border-line pt-2 text-[11px] text-ink">
            <span className="text-ink-3">Next action · </span>
            {memo.nextAction}
          </div>
        </div>
      )}
    </>
  );

  if (embedded) return <div className="mt-2">{inner}</div>;
  return <DashCard className="flex flex-col">{inner}</DashCard>;
}
