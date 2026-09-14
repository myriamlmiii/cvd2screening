import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth/role";
import { ingestGoogleDrive, driveFolderIds } from "@/lib/services/drive-ingest";
import { getDriveConnectorHealth } from "@/lib/services/drive-health";
import { logOp } from "@/lib/log";

function isCron(req: Request): boolean {
  return Boolean(process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`);
}

function authorized(req: Request): boolean {
  if (isCron(req)) return true;
  const secret = process.env.INTAKE_WEBHOOK_SECRET || process.env.SYNC_WEBHOOK_SECRET || process.env.CRON_SECRET;
  if (secret && req.headers.get("x-intake-secret") === secret) return true;
  if (currentRole() === "Admin") return true;
  return !secret && process.env.NODE_ENV !== "production";
}

async function runIngest() {
  const stats = await ingestGoogleDrive();
  logOp({ op: "api.sync.drive", status: "ok", ...stats });
  return stats;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shouldRun = url.searchParams.get("run") === "1" || isCron(req);
  if (shouldRun) {
    if (!authorized(req)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    try {
      const stats = await runIngest();
      const drive = await getDriveConnectorHealth();
      return NextResponse.json({ status: "ok", stats, drive });
    } catch (err) {
      logOp({ op: "api.sync.drive", status: "error", error: err instanceof Error ? err.message : "unknown" });
      const drive = await getDriveConnectorHealth();
      return NextResponse.json({ status: "error", error: "Drive sync failed. CRM data is unchanged.", drive }, { status: 502 });
    }
  }
  return NextResponse.json({ drive: await getDriveConnectorHealth() });
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!driveFolderIds().length) {
    const drive = await getDriveConnectorHealth();
    return NextResponse.json({ status: "skipped", message: "GOOGLE_DRIVE_FOLDER_IDS is not set.", drive });
  }
  try {
    const stats = await runIngest();
    return NextResponse.json({ status: "ok", stats, drive: await getDriveConnectorHealth() });
  } catch (err) {
    logOp({ op: "api.sync.drive", status: "error", error: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json(
      { error: "Drive ingest failed. Existing CRM records were not deleted.", drive: await getDriveConnectorHealth() },
      { status: 502 },
    );
  }
}
