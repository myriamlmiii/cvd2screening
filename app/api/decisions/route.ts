import { z } from "zod";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { canMutate } from "@/lib/auth/role";
import { supabaseAdmin } from "@/lib/services/supabase-rest";
import { findUserByEmail } from "@/lib/auth/users";
import { readSessionToken, sessionCookieName } from "@/lib/auth/session";
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

const HUMAN: Record<string, HumanDecision> = {
  Invest: "Invest",
  Advance: "Invest",
  Watch: "Watch",
  Hold: "Watch",
  Pass: "Pass",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LogRow = {
  id: string;
  deal_id: string;
  decision: string;
  decided_by: string | null;
  decided_by_user_id: string | null;
  note: string | null;
  created_at: string;
};

function toEvent(row: LogRow) {
  return {
    id: row.id,
    deal_id: row.deal_id,
    startup_id: row.deal_id,
    decision: row.decision,
    actor: row.decided_by,
    decided_by: row.decided_by,
    decided_by_user_id: row.decided_by_user_id,
    rationale: row.note,
    note: row.note,
    created_at: row.created_at,
  };
}

async function resolveDealId(raw: string): Promise<string | null> {
  const id = raw.trim();
  if (!id) return null;
  if (UUID.test(id)) return id;
  const byAirtable = await supabaseAdmin<{ id: string }[]>(
    `screened_deals?airtable_record_id=eq.${encodeURIComponent(id)}&select=id&limit=1`,
  );
  return byAirtable.ok ? byAirtable.data?.[0]?.id ?? null : null;
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("startupId") || new URL(req.url).searchParams.get("dealId");
  if (!raw) return NextResponse.json({ error: "startupId required" }, { status: 400 });
  const dealId = await resolveDealId(raw);
  if (!dealId) return NextResponse.json({ events: [] });
  const result = await supabaseAdmin<LogRow[]>(
    `decision_log?deal_id=eq.${encodeURIComponent(dealId)}&order=created_at.desc&select=*`,
  );
  if (!result.ok) return NextResponse.json({ events: [], error: result.error }, { status: result.status === 503 ? 503 : 200 });
  return NextResponse.json({ events: (result.data ?? []).map(toEvent) });
}

export async function POST(req: Request) {
  if (!canMutate()) {
    return NextResponse.json({ error: "Viewers cannot record human decisions." }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected { items: { id, gpDecision }[] }" }, { status: 400 });
  }

  const mapped = parsed.data.items.map((i) => {
    const human = HUMAN[i.gpDecision];
    if (!human) return null;
    return { ...i, human };
  });
  if (mapped.some((m) => !m)) {
    return NextResponse.json({ error: "Decision must be Invest, Watch, or Pass." }, { status: 400 });
  }
  const rows = mapped as NonNullable<(typeof mapped)[number]>[];

  const session = await readSessionToken(cookies().get(sessionCookieName())?.value);
  const user = session?.email ? await findUserByEmail(session.email) : null;
  const sessionEmail = session?.email || null;

  const events: {
    deal_id: string;
    decision: HumanDecision;
    decided_by: string | null;
    decided_by_user_id: string | null;
    note: string | null;
  }[] = [];
  for (const r of rows) {
    const dealId = await resolveDealId(r.id);
    if (!dealId) {
      return NextResponse.json(
        { error: `No screened_deals row for ${r.id}. decision_log.deal_id is a uuid.` },
        { status: 400 },
      );
    }
    events.push({
      deal_id: dealId,
      decision: r.human,
      decided_by: user?.email || sessionEmail || r.actor || null,
      decided_by_user_id: user?.id ?? null,
      note: r.rationale || null,
    });
  }

  const inserted = await supabaseAdmin<LogRow[]>("decision_log", {
    method: "POST",
    body: JSON.stringify(events),
    prefer: "return=representation",
  });
  if (!inserted.ok) {
    return NextResponse.json(
      { error: inserted.error || "Could not append decision_log row." },
      { status: inserted.status === 503 ? 503 : 502 },
    );
  }

  return NextResponse.json({
    previous: [],
    recorded: rows.map((r, i) => ({ id: r.id, deal_id: events[i].deal_id, decision: r.human })),
    rows: inserted.data ?? [],
  });
}
