"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/lib/i18n";

type EventRow = {
  id: string;
  decision: string;
  actor: string | null;
  rationale: string | null;
  created_at: string;
};

export function DecisionHistory({ startupId, note }: { startupId: string; note: string | null }) {
  const { t } = useLocale();
  const { data } = useQuery({
    queryKey: ["decisions", startupId],
    queryFn: async () => {
      const res = await fetch(`/api/decisions?startupId=${encodeURIComponent(startupId)}`);
      if (!res.ok) return [];
      const body = (await res.json()) as { events?: EventRow[] };
      return body.events ?? [];
    },
  });
  const events = data ?? [];

  if (!events.length) {
    return <p className="mt-2.5 whitespace-pre-wrap text-[11px] font-medium">{note || t("pages.noHistory")}</p>;
  }

  return (
    <ul className="mt-2.5 space-y-2">
      {events.map((ev) => (
        <li key={ev.id} className="border-b border-line pb-1.5 text-[11px]">
          <div className="flex justify-between gap-2 font-semibold">
            <span>{ev.decision}</span>
            <span className="font-mono text-[10px] text-ink-3">{ev.created_at.replace("T", " ").slice(0, 16)}</span>
          </div>
          {ev.rationale ? <p className="mt-0.5 text-ink-2">{ev.rationale}</p> : null}
          {ev.actor ? <p className="mt-0.5 text-[10px] text-ink-3">{ev.actor}</p> : null}
        </li>
      ))}
      {note ? <li className="whitespace-pre-wrap text-[11px] text-ink-2">{note}</li> : null}
    </ul>
  );
}
