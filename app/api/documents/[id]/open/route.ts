import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/services/supabase-rest";
import { withBackoff } from "@/lib/retry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STREAM_CAP = 50 * 1024 * 1024;

async function googleAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refresh = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refresh) return null;
  const res = await withBackoff(() =>
    fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refresh,
      }),
    }),
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const fileId = params.id;
  const meta = await supabaseAdmin<
    { filename: string | null; mime_type: string | null; byte_size: number | null; source_url: string | null; extraction_status: string | null }[]
  >(`startup_documents?external_file_id=eq.${encodeURIComponent(fileId)}&select=filename,mime_type,byte_size,source_url,extraction_status&limit=1`);
  const doc = meta.data?.[0];
  if (!doc) return NextResponse.json({ error: "Document is not in the CRM registry." }, { status: 404 });

  const size = doc.byte_size ?? 0;
  if (size > STREAM_CAP) {
    return NextResponse.json({
      error: "This file is too large to proxy through the CRM.",
      filename: doc.filename,
      size,
      processing: "NOT_PROCESSED",
      hint: "Metadata is in the CRM. Original media stays in Drive; the backend Google connection is required to fetch it.",
    }, { status: 413 });
  }

  const token = await googleAccessToken();
  if (!token) {
    return NextResponse.json({
      error: "Drive connector is offline. Document metadata remains in the CRM.",
      filename: doc.filename,
    }, { status: 503 });
  }

  const drive = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!drive.ok) {
    return NextResponse.json({ error: "Could not fetch the original from Drive.", filename: doc.filename }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", doc.mime_type || drive.headers.get("content-type") || "application/octet-stream");
  headers.set("Content-Disposition", `inline; filename="${(doc.filename || "document").split("/").pop()}"`);
  return new NextResponse(drive.body, { status: 200, headers });
}
