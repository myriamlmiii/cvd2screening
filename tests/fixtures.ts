import type { ScoredDeal } from "@/types";

export function deal(partial: Partial<ScoredDeal> & { name: string }): ScoredDeal {
  return {
    id: partial.id ?? "rec1",
    createdTime: null,
    name: partial.name,
    dateEntered: partial.dateEntered ?? null,
    fundingSought: partial.fundingSought ?? null,
    description: partial.description ?? null,
    pitchUrl: partial.pitchUrl ?? null,
    ficheUrl: null,
    sector: partial.sector ?? null,
    country: partial.country ?? null,
    status: partial.status ?? null,
    dateUpdated: partial.dateUpdated ?? null,
    update: partial.update ?? null,
    bpUrl: null,
    benchmarkUrl: null,
    demoUrl: null,
    valuation: null,
    investors: null,
    websiteUrl: partial.websiteUrl ?? null,
    marketStudyUrl: null,
    founder: partial.founder ?? null,
    email: null,
    whatsapp: null,
    ndaUrl: null,
    termSheetUrl: partial.termSheetUrl ?? null,
    dossierUrl: null,
    source: partial.source ?? null,
    score: partial.score ?? null,
  };
}
