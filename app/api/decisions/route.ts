import { z } from "zod";
import { NextResponse } from "next/server";
import { canMutate } from "@/lib/auth/role";
import { supabaseAdmin } from "@/lib/services/supabase-rest";
import type { HumanDecision } from "@/types";

const itemSchema = z.object({
  id: z.string().min(1),
  gpDecision: z.string().min(1),
  rationale: z.string().max(4000).optional(),
  tags: z.array(z.string()).max(12).optional(),
  aiRecommendation: z.string().max(80).optional().nullable(),
  actor: z.string().max(120).optional(),
});
const bodySchema = z.object({ items: z.array(itemSchema).min(1).max(50) });

type Item = z.infer<typeof itemSchema>;

const HUMAN: Record<string, HumanDecision> = {
  Invest: "Invest",
  Advance: "Invest",
  Watch: "Watch",
  Hold: "Watch",
  Pass: "Pass",
};

const GP: Record<HumanDecision, "Advance" | "Hold" | "Pass"> = {
  Invest: "Advance",
  Watch: "Hold",
  Pass: "Pass",
};

function idList(ids: string[]) {
  return ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
}

export async function GET(req: Request) {
  const startupId = new URL(req.url).searchParams.get("startupId");
  if (!startupId) return NextResponse.json({ error: "startupId required" }, { status: 400 });
  const result = await supabaseAdmin<{ id: string; decision: string; actor: string | null; rationale: string | null; created_at: string }[]>(
    `decision_events?startup_id=eq.${encodeURIComponent(startupId)}&order=created_at.desc&select=*`,
  );
  if (!result.ok) return NextResponse.json({ events: [], error: result.error }, { status: result.status === 503 ? 503 : 200 });
  return NextResponse.json({ events: result.data ?? [] });
}

export async function POST(req: Request) {
  if (!canMutate()) {
    return NextResponse.json({ error: "Viewers cannot record human decisions." }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected { items: { id, gpDecision }[] }" }, { status: 400 });
  }
  const items = parsed.data.items;

  const mapped = items.map((i) => {
    const human = HUMAN[i.gpDecision];
    if (!human) return null;
    return { ...i, human, gp: GP[human] };
  });
  if (mapped.some((m) => !m)) {
    return NextResponse.json({ error: "Decision must be Invest, Watch, or Pass." }, { status: 400 });
  }
  const rows = mapped as NonNullable<(typeof mapped)[number]>[];

  const ids = rows.map((r) => r.id);
  const current = await supabaseAdmin<{ source_record_id: string; gp_decision: string }[]>(
    `scored_deals?source_record_id=in.(${idList(ids)})&select=source_record_id,gp_decision`,
  );
  const previous = (current.data ?? []).map((r) => ({ id: r.source_record_id, gpDecision: r.gp_decision }));

  const events = rows.map((r) => ({
    startup_id: r.id,
    decision: r.human,
    actor: r.actor || "gp",
    rationale: r.rationale || null,
    tags: r.tags ?? [],
    ai_recommendation: r.aiRecommendation ?? null,
  }));
  const inserted = await supabaseAdmin("decision_events", {
    method: "POST",
    body: JSON.stringify(events),
    prefer: "return=minimal",
  });
  if (!inserted.ok && inserted.status !== 404) {
    const fallback = await supabaseAdmin("decision_events", {
      method: "POST",
      body: JSON.stringify(events.map(({ tags: _t, ai_recommendation: _a, ...rest }) => rest)),
      prefer: "return=minimal",
    });
    if (!fallback.ok && fallback.status !== 404) {
      return NextResponse.json(
        { error: inserted.error || "Could not append decision event. Re-run supabase/schema.sql." },
        { status: inserted.status === 503 ? 503 : 502 },
      );
    }
  }

  const byDecision = new Map<string, string[]>();
  for (const r of rows) {
    const list = byDecision.get(r.gp) ?? [];
    list.push(r.id);
    byDecision.set(r.gp, list);
  }
  for (const [gpDecision, targetIds] of byDecision) {
    const patch = await supabaseAdmin(`scored_deals?source_record_id=in.(${idList(targetIds)})`, {
      method: "PATCH",
      body: JSON.stringify({ gp_decision: gpDecision }),
    });
    if (!patch.ok && patch.status !== 404 && patch.status !== 400) {
      return NextResponse.json({ error: patch.error || "Could not update current decision pointer." }, { status: 502 });
    }
  }

  for (const r of rows) {
    const crm =
      r.human === "Pass" ? "Passed" : r.human === "Invest" ? "Shortlisted" : "Review";
    await supabaseAdmin(`startups?id=eq.${encodeURIComponent(r.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ crm_status: crm, updated_at: new Date().toISOString() }),
    });
  }

  await supabaseAdmin("startup_activity", {
    method: "POST",
    body: JSON.stringify(rows.map((r) => ({ startup_id: r.id, kind: "decision", detail: r.human }))),
    prefer: "return=minimal",
  });

  return NextResponse.json({ previous, recorded: rows.map((r) => ({ id: r.id, decision: r.human })) });
}
