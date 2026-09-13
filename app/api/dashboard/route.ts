import { NextResponse } from "next/server";
import { getOverviewPayload } from "@/lib/startups/dashboard";
import { startupQuerySchema } from "@/lib/startups/query";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = startupQuerySchema.pick({ status: true, sector: true, origin: true }).safeParse(Object.fromEntries(url.searchParams));
  const filters = parsed.success ? parsed.data : { status: "all", sector: "all", origin: "all" };
  const data = await getOverviewPayload(filters);
  return NextResponse.json(data);
}
