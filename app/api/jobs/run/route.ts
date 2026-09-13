import { NextResponse } from "next/server";
import { ingestGoogleDrive } from "@/lib/services/drive-ingest";
import { processQueuedScreenings } from "@/lib/services/screening-run";
import { currentRole } from "@/lib/auth/role";

function authorized(req: Request) {
  const secret = process.env.INTAKE_WEBHOOK_SECRET || process.env.SYNC_WEBHOOK_SECRET || process.env.CRON_SECRET;
  if (secret && (req.headers.get("x-intake-secret") === secret || req.headers.get("authorization") === `Bearer ${secret}`)) {
    return true;
  }
  if (currentRole() === "Admin") return true;
  return !secret && process.env.NODE_ENV !== "production";
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { type?: string };
  if (body.type === "drive_ingest") {
    const stats = await ingestGoogleDrive();
    return NextResponse.json({ status: "ok", stats });
  }
  const screening = await processQueuedScreenings(8);
  return NextResponse.json({ status: "ok", screening });
}
