import { THESIS } from "@/lib/thesis";
import type { PipelineDeal } from "@/types";

export type QualCheck = { name: string; passed: boolean; detail: string };

export type Qualification = {
  passed: boolean;
  checks: QualCheck[];
  flags: string[];
  matchedAiTerms: string[];
};

const AI_WORD = /\bai\b/i;

function haystack(deal: PipelineDeal): string {
  return [deal.description, deal.sector, deal.update, deal.name].filter(Boolean).join(" ").toLowerCase();
}

/** Permissive matcher: flags unclear deals; never drops them from the CRM. */
export function qualify(deal: PipelineDeal): Qualification {
  const hay = haystack(deal);
  const sector = (deal.sector || "").toLowerCase();
  const core = THESIS.coreSectors.some((s) => sector.includes(s.toLowerCase()));
  const adjacent = THESIS.opportunisticSectors.some((s) => sector.includes(s.toLowerCase()));
  const sectorCheck: QualCheck = core
    ? { name: "sector", passed: true, detail: `'${deal.sector}' matches a core sector` }
    : adjacent
      ? { name: "sector", passed: true, detail: `'${deal.sector}' is adjacent B2B — flag for GP` }
      : {
          name: "sector",
          passed: false,
          detail: deal.sector ? `'${deal.sector}' is unclear vs thesis` : "sector missing — keep visible",
        };

  const matchedAiTerms: string[] = THESIS.aiKeywords.filter((kw) => hay.includes(kw));
  if (AI_WORD.test(hay) && !matchedAiTerms.includes("ai")) matchedAiTerms.unshift("ai");
  const aiCheck: QualCheck = matchedAiTerms.length
    ? { name: "ai_layer", passed: true, detail: `matched: ${matchedAiTerms.slice(0, 4).join(", ")}` }
    : { name: "ai_layer", passed: false, detail: "no AI-native language found — rank lower, do not discard" };

  const geo = (deal.country || "").toLowerCase();
  const geoHit = !geo || THESIS.priorityGeographies.some((g) => geo.includes(g.toLowerCase()) || g.toLowerCase().includes(geo));
  const geoCheck: QualCheck = {
    name: "geography",
    passed: true,
    detail: !deal.country
      ? "geography missing — deferred"
      : geoHit
        ? `'${deal.country}' is a priority geography`
        : `'${deal.country}' is outside the priority list — exceptional-only`,
  };

  const checks = [sectorCheck, aiCheck, geoCheck];
  const flags = checks.filter((c) => !c.passed).map((c) => c.detail);
  return {
    passed: sectorCheck.passed || adjacent || Boolean(deal.description),
    checks,
    flags,
    matchedAiTerms,
  };
}
