import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/services/supabase-rest";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await supabaseAnon<
    {
      external_file_id: string;
      filename: string;
      document_type: string | null;
      startup_id: string;
      mime_type: string | null;
      missing_since: string | null;
    }[]
  >(
    "startup_documents?select=external_file_id,filename,document_type,startup_id,mime_type,missing_since&order=filename.asc&limit=80",
  );
  if (!result.ok) return NextResponse.json({ rows: [] });
  return NextResponse.json({ rows: result.data ?? [] });
}
