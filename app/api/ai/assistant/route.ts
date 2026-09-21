import { NextResponse } from "next/server";
import { z } from "zod";
import { completeText } from "@/lib/ai/provider";
import { getAssistantContext } from "@/lib/erp/payloads";
import { getStartupById } from "@/lib/screening";
import { logOp } from "@/lib/log";
import { clientKey, limitAiCalls } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  startupId: z.string().optional(),
});

export async function POST(req: Request) {
  const limited = await limitAiCalls(clientKey(req));
  if (!limited.success) {
    return NextResponse.json({ error: "Trop de requêtes IA. Réessayez plus tard." }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message requis." }, { status: 400 });

  const ctx = await getAssistantContext();
  let extra = "";
  if (parsed.data.startupId) {
    const deal = await getStartupById(parsed.data.startupId);
    if (deal) {
      extra = `\nFocus company: ${JSON.stringify({
        name: deal.name,
        sector: deal.sector,
        country: deal.country,
        status: deal.status,
        score: deal.score?.cvdScore ?? null,
        assessment: deal.score?.assessment?.slice(0, 500) ?? null,
        risks: deal.score?.risks?.slice(0, 4) ?? [],
        description: deal.description?.slice(0, 400) ?? null,
      })}`;
    }
  }

  const system = `You are Assistant U-investors, a VC CRM copilot.
Use only the CRM facts. Never invent ARR, churn, meetings, people, or amounts.
If missing, write "non renseigné dans le CRM".
Answer in French with exactly these markdown headings:
## Pourquoi c'est important
## Points clés à retenir
## Questions à poser
## Actions proposées
Each section is a short bullet list.
CRM snapshot (${ctx.generatedAt}): ${JSON.stringify(ctx)}${extra}`;

  try {
    const reply = await completeText([
      { role: "system", content: system },
      { role: "user", content: parsed.data.message },
    ]);
    if (!reply) {
      return NextResponse.json(
        { error: "GROQ_API_KEY manquant. L'assistant ne peut pas répondre sans modèle.", configured: false },
        { status: 503 },
      );
    }
    return NextResponse.json({ reply });
  } catch (err) {
    logOp({ op: "ai.assistant", status: "error", error: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ error: "Le modèle n'a pas répondu." }, { status: 502 });
  }
}
