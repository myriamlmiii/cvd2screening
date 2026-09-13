import { NextResponse } from "next/server";
import { getWorkflowPayload } from "@/lib/startups/dashboard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sector = new URL(req.url).searchParams.get("sector") || "all";
  return NextResponse.json(await getWorkflowPayload(sector));
}
