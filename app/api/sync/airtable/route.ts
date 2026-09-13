import { NextResponse } from "next/server";
import { canMutate, currentRole } from "@/lib/auth/role";
import { syncAirtable } from "@/lib/services/airtable-sync";
import { logOp } from "@/lib/log";

function authorized(req: Request): boolean {
  const secret = process.env.INTAKE_WEBHOOK_SECRET || process.env.SYNC_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-intake-secret") === secret) return true;
  if (currentRole() === "Admin") return true;
  return !secret && process.env.NODE_ENV !== "production";
}

export async function POST(req: Request) {
  if (!authorized(req) || !canMutate()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const started = Date.now();
  try {
    const stats = await syncAirtable();
    logOp({ op: "api.sync.airtable", status: "ok", duration_ms: Date.now() - started });
    return NextResponse.json({ status: "ok", stats });
  } catch (err) {
    logOp({ op: "api.sync.airtable", status: "error", error: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ error: "Airtable sync failed." }, { status: 502 });
  }
}
