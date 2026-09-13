import { NextResponse } from "next/server";
import { z } from "zod";
import { completeMemo } from "@/lib/ai/provider";
import { screeningHash } from "@/lib/ai/hash";
import { logOp } from "@/lib/log";

const bodySchema = z.object({
  name: z.string().min(1),
  sector: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  fundingSought: z.string().nullable().optional(),
  valuation: z.string().nullable().optional(),
  founder: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  update: z.string().nullable().optional(),
  investors: z.string().nullable().optional(),
  force: z.boolean().optional(),
});

const memoCache = new Map<string, { hash: string; memo: unknown }>();

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected a company payload with name." }, { status: 400 });
  }
  const body = parsed.data;
  const hash = screeningHash(body);
  if (!body.force) {
    const cached = memoCache.get(body.name);
    if (cached && cached.hash === hash) {
      logOp({ op: "ai.memo", status: "skipped", hash });
      return NextResponse.json(cached.memo);
    }
  }

  const facts = [
    `Company: ${body.name}`,
    `Sector: ${body.sector || "not on file"}`,
    `Country: ${body.country || "not on file"}`,
    `Pipeline status: ${body.status || "not on file"}`,
    `Ask: ${body.fundingSought || "not on file"}`,
    `Valuation: ${body.valuation || "not on file"}`,
    `Founder: ${body.founder || "not on file"}`,
    `Source: ${body.source || "not on file"}`,
    `Investors: ${body.investors || "not on file"}`,
    `Description: ${(body.description || "not on file").slice(0, 900)}`,
    `Latest note: ${(body.update || "not on file").slice(0, 700)}`,
  ].join("\n");

  try {
    const memo = await completeMemo([
      {
        role: "system",
        content:
          "You are an investment-committee associate. Use only the provided facts. Never invent numbers or traction. Do not make a final investment decision. Reply with JSON only: {recommendation: Strong Fit|Review|Needs Information|Watch|Lower Priority, conviction: High|Medium|Low, thesis: string, justification: string[3-5], gaps: string[2-4], nextAction: string}. Prefer Needs Information when the dossier is thin. This is an attention ranking, not an invest/pass decision.",
      },
      { role: "user", content: facts },
    ]);
    if (!memo) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not set or the IC memo was invalid. Nothing was stored.", configured: Boolean(process.env.GROQ_API_KEY) },
        { status: process.env.GROQ_API_KEY ? 502 : 503 },
      );
    }
    memoCache.set(body.name, { hash, memo });
    return NextResponse.json(memo);
  } catch (err) {
    logOp({ op: "ai.memo", status: "error", error: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ error: "AI provider failed.", configured: true }, { status: 502 });
  }
}
