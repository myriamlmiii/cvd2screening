import { NextResponse } from "next/server";
import { getDriveConnectorHealth } from "@/lib/services/drive-health";
import { supabaseAnon } from "@/lib/services/supabase-rest";

export const dynamic = "force-dynamic";

export async function GET() {
  const [drive, count] = await Promise.all([
    getDriveConnectorHealth(),
    supabaseAnon<{ count: number }[]>("startups?select=id&limit=1"),
  ]);
  return NextResponse.json({
    crm: {
      available: true,
      note: "Authorized CRM users read Supabase. They do not need a Google login.",
    },
    drive,
    supabaseReachable: count.ok,
  });
}
