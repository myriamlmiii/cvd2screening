import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnalyticsPayload } from "@/lib/startups/dashboard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const page = z.coerce.number().int().min(0).optional().default(0).parse(new URL(req.url).searchParams.get("page") ?? "0");
  return NextResponse.json(await getAnalyticsPayload(page));
}
