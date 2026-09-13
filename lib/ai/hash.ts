import { createHash } from "crypto";
import type { PipelineDeal } from "@/types";

export function screeningHash(
  deal: Pick<PipelineDeal, "name" | "description" | "sector" | "country" | "fundingSought" | "update" | "founder"> | {
    name: string;
    description?: string | null;
    sector?: string | null;
    country?: string | null;
    fundingSought?: string | null;
    update?: string | null;
    founder?: string | null;
  },
): string {
  const raw = [
    deal.name,
    deal.description,
    deal.sector,
    deal.country,
    deal.fundingSought,
    deal.update,
    deal.founder,
  ]
    .map((v) => (v || "").trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}
