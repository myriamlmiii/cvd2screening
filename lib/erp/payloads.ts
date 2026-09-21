import { getPortfolio } from "@/lib/airtable";
import { prioritize } from "@/lib/crm";
import { displayScore } from "@/lib/deal-view";
import { getScoredPipeline, getStartupById } from "@/lib/screening";
import { slimDeal } from "@/lib/startups/slim";
import {
  calendarEvents,
  commercialStatus,
  contactsFromDeals,
  derivedTasks,
  funnelStage,
  FUNNEL,
  isPortfolioDeal,
  kpiTrio,
  needsDecision,
  nextActions,
  notifications,
  overviewFacts,
  portfolioKpis,
  questions,
  situationBullets,
  whyNow,
} from "@/lib/erp/model";
import { formatCountry, formatMoneyField, formatMultiple, rowMultiple, investYear, stakeValue, parseEuroAmount } from "@/lib/erp/display";
import { sourceDocuments } from "@/lib/crm";

export async function getSituationPayload() {
  const deals = await getScoredPipeline();
  const ranked = prioritize(deals).slice(0, 5);
  const featured = ranked[0] ?? null;
  const pendingAll = deals.filter(needsDecision);
  const pending = ranked.filter(needsDecision);
  return {
    pendingCount: pendingAll.length,
    pending: pending.map((d) => ({
      ...slimDeal(d),
      why: whyNow(d),
      statusLabel: commercialStatus(d),
      bullets: situationBullets(d),
      actions: nextActions(d),
      questions: questions(d),
      kpis: kpiTrio(d),
    })),
    top: ranked.map((d, i) => ({
      rank: i + 1,
      ...slimDeal(d),
      why: whyNow(d),
      statusLabel: commercialStatus(d),
      score: displayScore(d),
    })),
    featured: featured
      ? {
          ...slimDeal(featured),
          why: whyNow(featured),
          statusLabel: commercialStatus(featured),
          bullets: situationBullets(featured),
          actions: nextActions(featured),
          questions: questions(featured),
          kpis: kpiTrio(featured),
          needsDecision: needsDecision(featured),
        }
      : null,
    notifications: notifications(deals),
    taskCount: derivedTasks(deals).length,
  };
}

export async function getPipelinePayload() {
  const deals = await getScoredPipeline();
  const live = deals.filter((d) => funnelStage(d) !== "passed");
  const counts = Object.fromEntries(FUNNEL.map((f) => [f.id, live.filter((d) => funnelStage(d) === f.id).length])) as Record<string, number>;
  return {
    total: live.length,
    counts,
    rows: live.map((d) => ({
      ...slimDeal(d),
      stage: funnelStage(d),
      why: whyNow(d),
      statusLabel: commercialStatus(d),
      score: displayScore(d),
      pitchUrl: d.pitchUrl,
      valuation: formatMoneyField(d.valuation),
      fundingSought: formatMoneyField(d.fundingSought),
    })),
  };
}

export async function getPortfolioPayload() {
  const [deals, companies] = await Promise.all([getScoredPipeline(), getPortfolio()]);
  const kpis = portfolioKpis(companies, deals);
  const fromTable = companies.map((c) => ({
    id: c.id,
    name: c.name,
    sector: c.sector,
    country: c.country,
    investDate: c.investDate,
    investCvd: c.investCvd,
    valoInitial: formatMoneyField(c.valoInitial),
    valoFinal: formatMoneyField(c.valoFinal || c.valoInitial),
    pct: c.pctTotal || c.pctCvd,
    multiple: formatMultiple(rowMultiple(c)),
    investYear: investYear(c.investDate),
    stake: stakeValue(c),
    investedN: parseEuroAmount(c.investCvd),
    situation: c.situation,
    websiteUrl: null as string | null,
    mrr: c.mrrBeforeInvest,
    burn: c.monthlyBurn,
    round: c.round,
    source: "portfolio" as const,
  }));
  const fromDeals = deals.filter(isPortfolioDeal).map((d) => ({
    id: d.id,
    name: d.name,
    sector: d.sector,
    country: d.country,
    investDate: d.dateEntered,
    investCvd: formatMoneyField(d.fundingSought),
    valoInitial: null as string | null,
    valoFinal: formatMoneyField(d.valuation),
    pct: null as string | null,
    multiple: null as string | null,
    investYear: investYear(d.dateEntered),
    stake: null as number | null,
    investedN: parseEuroAmount(d.fundingSought),
    situation: d.status,
    websiteUrl: d.websiteUrl,
    mrr: null as string | null,
    burn: null as string | null,
    round: d.engagementStage,
    source: "pipeline" as const,
  }));
  const rows = fromTable.length ? fromTable : fromDeals;
  const years = [2024, 2025, 2026].map((year) => ({
    year: String(year),
    invested: rows.filter((r) => r.investYear === year).reduce((s, r) => s + (r.investedN || 0), 0),
    value: rows.filter((r) => r.investYear === year).reduce((s, r) => s + (r.stake || 0), 0),
  }));
  const sectors = countPairs(rows.map((r) => r.sector || "Autre"));
  const geos = countPairs(rows.map((r) => formatCountry(r.country).name));
  return { kpis, rows, sectors, geos, companies, years };
}

export async function getTasksPayload() {
  const deals = await getScoredPipeline();
  const tasks = derivedTasks(deals);
  return {
    tasks,
    open: tasks.length,
    urgent: tasks.filter((t) => t.tone === "red").length,
    late: tasks.filter((t) => t.tone === "red").length,
    ic: tasks.filter((t) => t.statut === "À valider").length,
    unassigned: tasks.filter((t) => t.assignee === "À assigner").length,
  };
}

export async function getFichePayload(id: string) {
  const portfolio = await getPortfolio();
  const company = portfolio.find((c) => c.id === id) ?? null;
  let deal = await getStartupById(id);
  if (!deal && company) {
    deal = (await getScoredPipeline()).find((d) => d.name.toLowerCase() === company.name.toLowerCase());
  }
  if (!deal && company) {
    return {
      deal: {
        id: company.id,
        name: company.name,
        sector: company.sector,
        country: company.country,
        status: company.situation,
        fundingSought: company.investCvd,
        source: company.source,
        founder: null,
        dateEntered: company.investDate,
        dateUpdated: company.createdTime,
        websiteUrl: null,
        description: company.situation,
        score: null,
        email: null,
        whatsapp: null,
        update: company.exchanges,
        termSheetUrl: null,
      },
      stage: "closed" as const,
      statusLabel: { label: company.situation || "Actif", tone: "green" as const },
      score: null,
      kpis: [
        { label: "Investi", value: company.investCvd || "—", hint: company.round || "" },
        { label: "Valorisation", value: company.valoFinal || company.valoInitial || "—", hint: "portfolio" },
        { label: "Dernière interaction", value: company.investDate || "—", hint: "" },
      ],
      facts: [
        { label: "Activité", value: company.situation || "—" },
        { label: "Pays", value: company.country || "—" },
        { label: "Secteur", value: company.sector || "—" },
        { label: "Instrument", value: company.instrument || "—" },
        { label: "Site web", value: "—" },
      ],
      bullets: [company.situation, company.negotiationPoints, company.unexpectedEvents].filter(Boolean) as string[],
      actions: [],
      questions: [],
      docs: [],
      activity: company.investDate ? [{ when: company.createdTime || "", title: "Investissement", detail: company.investCvd || "" }] : [],
      company,
      needsDecision: false,
    };
  }
  if (!deal) return null;
  const linked = company ?? portfolio.find((c) => c.name.toLowerCase() === deal.name.toLowerCase()) ?? null;
  return {
    deal: {
      ...slimDeal(deal),
      email: deal.email,
      whatsapp: deal.whatsapp,
      update: deal.update,
      termSheetUrl: deal.termSheetUrl,
      websiteUrl: deal.websiteUrl,
    },
    stage: funnelStage(deal),
    statusLabel: commercialStatus(deal),
    score: displayScore(deal),
    kpis: kpiTrio(deal),
    facts: overviewFacts(deal),
    bullets: situationBullets(deal),
    actions: nextActions(deal),
    questions: questions(deal),
    docs: sourceDocuments(deal),
    activity: [
      deal.dateUpdated && { when: deal.dateUpdated, title: "Mise à jour dossier", detail: deal.update || "Champs CRM actualisés" },
      deal.score?.scoredAt && { when: deal.score.scoredAt, title: "Screening IA", detail: deal.score.assessment?.slice(0, 160) || "Score enregistré" },
      deal.dateEntered && { when: deal.dateEntered, title: "Entrée pipeline", detail: deal.source || "Source interne" },
    ].filter(Boolean),
    company: linked,
    needsDecision: needsDecision(deal),
  };
}

function countPairs(values: string[]) {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].map(([label, n]) => ({ label, n }));
}

export async function getAgendaPayload() {
  const deals = await getScoredPipeline();
  const events = calendarEvents(deals);
  const tasks = derivedTasks(deals);
  return {
    events,
    unscheduled: tasks.filter((t) => t.echeance === "À planifier" || t.echeance === "En cours"),
    upcoming: events
      .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8),
  };
}

export async function getRelationsPayload() {
  const deals = await getScoredPipeline();
  const contacts = contactsFromDeals(deals);
  return {
    contacts,
    totals: {
      all: contacts.length,
      founders: contacts.filter((c) => c.kind === "Fondateur").length,
      investors: contacts.filter((c) => c.kind === "Investisseur").length,
      partners: contacts.filter((c) => c.kind === "Partenaire").length,
    },
    recent: [...contacts]
      .sort((a, b) => String(b.lastTouch || "").localeCompare(String(a.lastTouch || "")))
      .slice(0, 6),
  };
}

export async function getAssistantContext() {
  const deals = await getScoredPipeline();
  const ranked = prioritize(deals).slice(0, 25);
  return {
    generatedAt: new Date().toISOString(),
    counts: {
      pipeline: deals.length,
      awaiting: deals.filter(needsDecision).length,
      tasks: derivedTasks(deals).length,
    },
    focus: ranked.map((d) => ({
      id: d.id,
      name: d.name,
      sector: d.sector,
      country: d.country,
      status: d.status,
      score: displayScore(d),
      founder: d.founder,
      ask: d.fundingSought,
      why: whyNow(d),
      summary: (d.score?.assessment || d.description || "").slice(0, 280),
    })),
  };
}

export type SituationPayload = Awaited<ReturnType<typeof getSituationPayload>>;
export type PipelinePayload = Awaited<ReturnType<typeof getPipelinePayload>>;
export type PortfolioPayload = Awaited<ReturnType<typeof getPortfolioPayload>>;
export type TasksPayload = Awaited<ReturnType<typeof getTasksPayload>>;
export type FichePayload = Awaited<ReturnType<typeof getFichePayload>>;
export type AgendaPayload = Awaited<ReturnType<typeof getAgendaPayload>>;
export type RelationsPayload = Awaited<ReturnType<typeof getRelationsPayload>>;
export type AssistantContext = Awaited<ReturnType<typeof getAssistantContext>>;
