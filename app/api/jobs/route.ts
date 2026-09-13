import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/services/supabase-rest";
import { canMutate } from "@/lib/auth/role";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["airtable_sync", "drive_ingest", "ai_screening", "bulk_enrichment", "intake"]),
  startupId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const result = await supabaseAdmin<{ id: string; type: string; status: string; started_at: string | null; completed_at: string | null; error: string | null }[]>(
    "processing_jobs?select=id,type,status,started_at,completed_at,error,attempts&order=created_at.desc&limit=20",
  );
  return NextResponse.json({ jobs: result.data ?? [], error: result.ok ? null : result.error });
}

export async function POST(req: Request) {
  if (!canMutate()) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid job." }, { status: 400 });
  const inserted = await supabaseAdmin("processing_jobs", {
    method: "POST",
    body: JSON.stringify([{ type: parsed.data.type, startup_id: parsed.data.startupId ?? null, status: "QUEUED", metadata: parsed.data.metadata ?? {} }]),
    prefer: "return=representation",
  });
  return NextResponse.json({ job: inserted.data, error: inserted.error }, { status: inserted.ok ? 201 : 502 });
}
