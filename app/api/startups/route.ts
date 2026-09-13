import { NextResponse } from "next/server";
import { queryStartups } from "@/lib/startups/query";
import { slimDeal } from "@/lib/startups/slim";
import { logOp } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const started = Date.now();
  try {
    const url = new URL(req.url);
    const result = await queryStartups(Object.fromEntries(url.searchParams.entries()));
    logOp({ op: "startups.list", total: result.total, page: result.page, duration_ms: Date.now() - started });
    return NextResponse.json({
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      facets: result.facets,
      rows: result.rows.map(slimDeal),
    });
  } catch (err) {
    logOp({ op: "startups.list", status: "error", error: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ error: "Invalid startup query." }, { status: 400 });
  }
}
