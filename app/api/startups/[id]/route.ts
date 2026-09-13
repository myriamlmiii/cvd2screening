import { NextResponse } from "next/server";
import { getStartupById } from "@/lib/screening";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const deal = await getStartupById(params.id);
  if (!deal) return NextResponse.json({ error: "Startup not found." }, { status: 404 });
  return NextResponse.json(deal);
}
