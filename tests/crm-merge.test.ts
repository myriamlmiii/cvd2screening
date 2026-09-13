import { describe, expect, it } from "vitest";
import { mergeCrmWithFallback } from "@/lib/startups/merge";
import type { ScoredDeal } from "@/types";

function deal(id: string, name: string): ScoredDeal {
  return { id, name, createdTime: "", dateEntered: null, fundingSought: null, description: null, pitchUrl: null, ficheUrl: null, sector: null, country: null, status: null, dateUpdated: null, update: null, bpUrl: null, benchmarkUrl: null, demoUrl: null, valuation: null, investors: null, websiteUrl: null, marketStudyUrl: null, founder: null, email: null, whatsapp: null, ndaUrl: null, termSheetUrl: null, dossierUrl: null, source: null, score: null };
}

describe("CRM is independent of Drive", () => {
  it("keeps snapshot companies when CRM already has Drive-ingested rows", () => {
    const crm = [deal("gdrive:folder:1", "DEVAITO")];
    const snapshot = [deal("air-1", "Atlas AI"), deal("air-2", "DEVAITO")];
    const merged = mergeCrmWithFallback(crm, snapshot);
    expect(merged.map((d) => d.name).sort()).toEqual(["Atlas AI", "DEVAITO"]);
  });

  it("falls back entirely when CRM is empty (Drive never connected)", () => {
    const snapshot = [deal("air-1", "Atlas AI")];
    expect(mergeCrmWithFallback([], snapshot)).toEqual(snapshot);
  });
});
