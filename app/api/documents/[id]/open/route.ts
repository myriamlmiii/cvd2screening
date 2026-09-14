import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/services/supabase-rest";
import { serviceAccountAccessToken } from "@/lib/google/service-account";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STREAM_CAP = 50 * 1024 * 1024;

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

  const token = await serviceAccountAccessToken();
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
