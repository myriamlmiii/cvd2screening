import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertFromRaw } from "@/lib/services/startup-service";
import { logOp } from "@/lib/log";
import type { StartupSourceType } from "@/lib/domain/crm";

const intakeSchema = z.object({
  name: z.string().min(1),
  website: z.string().nullable().optional(),
  source_type: z.string().optional(),
  source_reference: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

function sourceType(raw?: string): StartupSourceType {
  if (raw === "DIRECT_APPLICATION" || raw === "EMAIL" || raw === "REFERRAL" || raw === "AIRTABLE" || raw === "GOOGLE_DRIVE" || raw === "MANUAL_ENTRY") return raw;
  return "EXTERNAL_SOURCE";
}

export async function POST(req: Request) {
  const secret = process.env.INTAKE_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-intake-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = intakeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const body = parsed.data;
  const type = sourceType(body.source_type);
  const externalId = body.source_reference || `intake:${body.name.toLowerCase()}`;

  try {
    const result = await upsertFromRaw({
      sourceType: type,
      sourceName: type,
      externalId,
      payload: { name: body.name, website: body.website ?? null, description: body.description ?? null },
    });
    logOp({ op: "intake", status: result.action, startupId: result.startupId, source: type });
    return NextResponse.json({
      status: result.action === "flagged_duplicate" ? "duplicate_flagged" : result.action,
      startupId: result.startupId,
      sourceType: type,
    });
  } catch (err) {
    logOp({ op: "intake", status: "error", error: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ error: "Intake failed." }, { status: 502 });
  }
}
