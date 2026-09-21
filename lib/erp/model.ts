import { aiRecommendation, awaitingReview, completenessPct, crmStatus, sourceDocuments } from "@/lib/crm";
import { displayScore } from "@/lib/deal-view";
import { formatAppDate, formatHeaderDate as formatHeaderDateLocale, relativeDate, formatEuro } from "@/lib/dates";
import { parseEuroAmount, formatMoneyField, formatCountry, rowMultiple, stakeValue } from "@/lib/erp/display";
import type { PortfolioCompany, ScoredDeal } from "@/types";

export type FunnelStage = "sourcing" | "diligence" | "ic" | "negotiation" | "closed" | "passed";

export const FUNNEL: { id: FunnelStage; label: string; hint: string }[] = [
  { id: "sourcing", label: "En sourcing", hint: "Qualification" },
  { id: "diligence", label: "En due diligence", hint: "Étude" },
  { id: "ic", label: "En IC", hint: "Comité" },
  { id: "negotiation", label: "En négociation", hint: "Term sheet" },
  { id: "closed", label: "Closed", hint: "Investi" },
];

const AVATAR_TONES = ["#0d9488", "#7c3aed", "#ea580c", "#4f46e5", "#db2777", "#2563eb", "#16a34a"];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function avatarTone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[h];
}

export function formatFrDate(iso: string | null | undefined) {
  return formatAppDate(iso, "fr");
}

export function formatHeaderDate(d = new Date()) {
  return formatHeaderDateLocale(d, "fr");
}

export function relativeFr(iso: string | null | undefined) {
  return relativeDate(iso, "fr");
}

export function funnelStage(deal: ScoredDeal): FunnelStage {
  const eng = (deal.engagementStage || "").toLowerCase();
  const raw = (deal.status || "").toLowerCase();
  if (eng.includes("négoc") || eng.includes("negoc") || raw.includes("négoc") || Boolean(deal.termSheetUrl && crmStatus(deal) === "Shortlisted")) {
    return "negotiation";
  }
  if (crmStatus(deal) === "Selected" || raw === "portfolio") return "closed";
  if (crmStatus(deal) === "Passed") return "passed";
  if (crmStatus(deal) === "Shortlisted") return "ic";
  if (crmStatus(deal) === "Reviewing") return "diligence";
  return "sourcing";
}

export function commercialStatus(deal: ScoredDeal): { label: string; tone: "green" | "blue" | "amber" | "violet" | "slate" } {
  if (funnelStage(deal) === "closed") return { label: "Portfolio monitoring", tone: "blue" };
  if (funnelStage(deal) === "negotiation") return { label: "En négociation", tone: "green" };
  if (funnelStage(deal) === "ic") return { label: "Discussion active", tone: "blue" };
  if (funnelStage(deal) === "diligence") return { label: "Due diligence / commercial", tone: "green" };
  if (completenessPct(deal) < 45 || aiRecommendation(deal) === "Needs Information") {
    return { label: "Documentation incomplète", tone: "amber" };
  }
  return { label: "Qualification", tone: "blue" };
}

function updateLine(deal: ScoredDeal): string | null {
  const line = (deal.update || "")
    .replace(/\*\*/g, "")
    .split(/\n+/)
    .map((s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim())
    .find((s) => s.length > 8 && !s.startsWith("http") && !/^conclusion\s*:/i.test(s));
  return line ? line.slice(0, 90) : null;
}

function isTermSheetDoc(url: string | null | undefined) {
  if (!url) return false;
  return /term[\s._-]*sheet|lettre\s*d['’]?intention|\bloi\b/i.test(url);
}

export function whyNow(deal: ScoredDeal): string {
  const note = updateLine(deal);
  if (note) return note;
  if (isTermSheetDoc(deal.termSheetUrl)) return "Term sheet reçue";
  const updated = deal.dateUpdated ? new Date(deal.dateUpdated).getTime() : NaN;
  if (Number.isFinite(updated) && Date.now() - updated < 14 * 86_400_000) {
    return `Activité récente · ${relativeFr(deal.dateUpdated)}`;
  }
  if (funnelStage(deal) === "ic") return "Comité d'investissement à préparer";
  if (funnelStage(deal) === "diligence") return "Due diligence en cours";
  if (funnelStage(deal) === "negotiation") return "Négociation / term sheet";
  if (completenessPct(deal) < 45) return "Dossier incomplet";
  if (deal.status) return deal.status;
  return "Nouveau lead";
}

export function needsDecision(deal: ScoredDeal): boolean {
  const gp = deal.score?.gpDecision;
  if (gp === "Advance" || gp === "Pass" || gp === "Hold") return false;
  if (deal.termSheetUrl) return true;
  return aiRecommendation(deal) === "Strong Fit" && awaitingReview(deal);
}

export function decisionPrompt(deal: ScoredDeal) {
  if (deal.termSheetUrl) {
    return {
      title: `Accepter la term sheet reçue pour ${deal.name} ?`,
      body: "Term sheet reçue, conforme aux échanges précédents.",
      source: "email / dossier",
    };
  }
  return {
    title: `Décider du prochain pas pour ${deal.name} ?`,
    body: deal.score?.assessment?.slice(0, 220) || deal.description?.slice(0, 220) || "Dossier en attente d'arbitrage GP.",
    source: deal.source || "pipeline",
  };
}

export function situationBullets(deal: ScoredDeal): string[] {
  const bits: string[] = [];
  if (deal.update) {
    const first = deal.update.split(/\n+/).map((s) => s.trim()).filter(Boolean)[0];
    if (first) bits.push(first);
  }
  if (deal.score?.strengths?.[0]) bits.push(deal.score.strengths[0]);
  if (deal.fundingSought) bits.push(`Ticket / levée : ${deal.fundingSought}`);
  if (deal.description) bits.push(deal.description.trim());
  return bits.slice(0, 3);
}

export function nextActions(deal: ScoredDeal): { label: string; due: string }[] {
  const actions: { label: string; due: string }[] = [];
  if (deal.termSheetUrl) actions.push({ label: "Valider proposition commerciale", due: relativeFr(deal.dateUpdated) });
  if (funnelStage(deal) === "ic" || funnelStage(deal) === "diligence") {
    actions.push({ label: "Préparer comité d'investissement", due: "À planifier" });
  }
  if (!deal.founder && !deal.email) actions.push({ label: "Organiser call avec le CEO", due: "À planifier" });
  if (completenessPct(deal) < 60) actions.push({ label: "Compléter le dossier (Drive)", due: "En cours" });
  if (!actions.length) actions.push({ label: "Suivre le dossier", due: relativeFr(deal.dateUpdated) });
  return actions.slice(0, 3);
}

export function questions(deal: ScoredDeal): string[] {
  const fromScore = deal.score?.missingInformation?.filter(Boolean) ?? [];
  const risks = (deal.score?.risks ?? []).map((r) => r.label || r.detail).filter(Boolean);
  const list = [...fromScore, ...risks];
  if (list.length) return list.slice(0, 3);
  const out: string[] = [];
  if (deal.fundingSought) out.push("Valider le montant et les conditions");
  if (!deal.investors) out.push("Inclure un co-investisseur ?");
  if (!out.length) out.push("Confirmer le prochain jalon commercial");
  return out.slice(0, 3);
}

export function overviewFacts(deal: ScoredDeal) {
  return [
    { label: "Activité", value: deal.description?.replace(/\s+/g, " ").slice(0, 140) || "—" },
    { label: "Pays", value: formatCountry(deal.country).name },
    { label: "Stade", value: deal.engagementStage || crmStatus(deal) },
    { label: "Thèse", value: deal.sector || "—" },
    { label: "Progression commerciale", value: commercialStatus(deal).label },
    { label: "Références clients", value: deal.update?.slice(0, 80) || "—" },
    { label: "Date d'entrée", value: formatFrDate(deal.dateEntered) },
    { label: "Financement recherché", value: formatMoneyField(deal.fundingSought) },
    { label: "Valorisation recherchée", value: formatMoneyField(deal.valuation) },
    { label: "Investisseurs", value: deal.investors || "—" },
    { label: "Site web", value: deal.websiteUrl || "—" },
  ];
}

export function kpiTrio(deal: ScoredDeal) {
  return [
    { key: "arr", label: "ARR signé", value: "—", hint: "non renseigné", delta: null as string | null },
    { key: "churn", label: "Churn", value: "—", hint: "non renseigné", delta: null as string | null },
    { key: "touch", label: "Dernière interaction", value: relativeFr(deal.dateUpdated || deal.dateEntered), hint: "", delta: null as string | null },
  ];
}

export function isPortfolioDeal(deal: ScoredDeal) {
  return funnelStage(deal) === "closed";
}

export function portfolioKpis(companies: PortfolioCompany[], deals: ScoredDeal[]) {
  const active = companies.length ? companies : deals.filter(isPortfolioDeal);
  const invested = companies.reduce((sum, c) => sum + (parseEuroAmount(c.investCvd) ?? 0), 0);
  const value = companies.reduce((sum, c) => sum + (stakeValue(c) ?? 0), 0);
  const withMultiple = companies.map(rowMultiple).filter((n): n is number => n != null);
  const multiple =
    withMultiple.length > 0 ? withMultiple.reduce((a, b) => a + b, 0) / withMultiple.length : invested > 0 && value > 0 ? value / invested : null;
  return {
    count: active.length,
    invested,
    value,
    multiple,
    exits: companies.filter((c) => /exit|sorti|sold/i.test(c.situation || c.position || "")).length,
  };
}

export function moneyFr(value: number | null, fallback = "—") {
  return formatEuro(value, fallback);
}

export function derivedTasks(deals: ScoredDeal[]) {
  const tasks: {
    id: string;
    title: string;
    startupId: string;
    startup: string;
    tone: "red" | "amber" | "green" | "blue";
    echeance: string;
    statut: string;
    assignee: string;
    priorite: "Haute" | "Moyenne" | "Basse";
    role: string;
    file: string;
  }[] = [];

  for (const deal of deals) {
    const docs = sourceDocuments(deal);
    if (needsDecision(deal)) {
      tasks.push({
        id: `${deal.id}-decision`,
        title: deal.termSheetUrl ? "Valider term sheet / IC" : "Arbitrer le dossier",
        startupId: deal.id,
        startup: deal.name,
        tone: "red",
        echeance: relativeFr(deal.dateUpdated),
        statut: "À faire",
        assignee: deal.founder || "À assigner",
        priorite: "Haute" as const,
        role: "GP",
        file: deal.termSheetUrl ? "Term sheet" : "Dossier",
      });
    }
    if (completenessPct(deal) < 50 && awaitingReview(deal)) {
      tasks.push({
        id: `${deal.id}-docs`,
        title: "Compléter le dossier fondateur",
        startupId: deal.id,
        startup: deal.name,
        tone: "amber",
        echeance: "En cours",
        statut: "En cours",
        assignee: "À assigner",
        priorite: "Moyenne" as const,
        role: "Analyste",
        file: docs[0]?.label || "Drive",
      });
    }
    if (funnelStage(deal) === "ic") {
      tasks.push({
        id: `${deal.id}-ic`,
        title: "Préparer note IC",
        startupId: deal.id,
        startup: deal.name,
        tone: "blue",
        echeance: deal.dateEntered ? relativeFr(deal.dateEntered) : "À planifier",
        statut: "À valider",
        assignee: "À assigner",
        priorite: "Haute" as const,
        role: "IC",
        file: "Note IC",
      });
    }
  }
  return tasks.slice(0, 40);
}

export function notifications(deals: ScoredDeal[]) {
  const items: {
    id: string;
    title: string;
    subtitle: string;
    when: string;
    kind: "term_sheet" | "docs" | "meeting" | "overdue";
  }[] = [];
  for (const deal of deals) {
    if (deal.termSheetUrl) {
      items.push({
        id: `${deal.id}-ts`,
        title: "Term sheet reçue",
        subtitle: deal.name,
        when: relativeFr(deal.dateUpdated),
        kind: "term_sheet",
      });
    }
    const docs = deal.driveDocuments ?? [];
    if (docs.length) {
      items.push({
        id: `${deal.id}-docs`,
        title: "Documents ajoutés",
        subtitle: deal.name,
        when: relativeFr(deal.dateUpdated),
        kind: "docs",
      });
    }
  }
  const overdue = derivedTasks(deals).filter((t) => t.tone === "red").slice(0, 3);
  for (const t of overdue) {
    items.push({
      id: t.id,
      title: "Tâche en retard",
      subtitle: t.title,
      when: t.echeance,
      kind: "overdue",
    });
  }
  return items.slice(0, 8);
}

export function countryFlag(country: string | null | undefined) {
  const c = (country || "").toLowerCase();
  if (c.includes("maroc") || c.includes("morocco")) return "🇲🇦";
  if (c.includes("france")) return "🇫🇷";
  if (c.includes("eau") || c.includes("emirat") || c.includes("uae") || c.includes("dubai")) return "🇦🇪";
  if (c.includes("sénégal") || c.includes("senegal")) return "🇸🇳";
  if (c.includes("tunis")) return "🇹🇳";
  if (c.includes("côte") || c.includes("ivoire")) return "🇨🇮";
  if (c.includes("usa") || c.includes("états") || c.includes("united states")) return "🇺🇸";
  return "";
}

export type ContactKind = "Fondateur" | "Investisseur" | "Partenaire";

export type CrmContact = {
  id: string;
  name: string;
  organization: string;
  kind: ContactKind;
  startupId: string;
  startup: string;
  country: string | null;
  lastTouch: string | null;
  nextAction: string;
  email: string | null;
};

export function contactsFromDeals(deals: ScoredDeal[]): CrmContact[] {
  const rows: CrmContact[] = [];
  for (const deal of deals) {
    if (deal.founder?.trim()) {
      rows.push({
        id: `${deal.id}-founder`,
        name: deal.founder.trim(),
        organization: deal.name,
        kind: "Fondateur",
        startupId: deal.id,
        startup: deal.name,
        country: deal.country,
        lastTouch: deal.dateUpdated || deal.dateEntered,
        nextAction: nextActions(deal)[0]?.label || "Suivre le dossier",
        email: deal.email,
      });
    }
    const investors = (deal.investors || "")
      .split(/[,;/|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);
    for (const inv of investors) {
      rows.push({
        id: `${deal.id}-inv-${inv.toLowerCase()}`,
        name: inv,
        organization: inv,
        kind: "Investisseur",
        startupId: deal.id,
        startup: deal.name,
        country: deal.country,
        lastTouch: deal.dateUpdated,
        nextAction: "Partager un mémo",
        email: null,
      });
    }
  }
  return rows;
}

export type CalendarEvent = {
  id: string;
  title: string;
  startupId: string;
  startup: string;
  date: string;
  kind: "pipeline" | "portfolio" | "task" | "diligence" | "ic";
};

function dayKey(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function calendarEvents(deals: ScoredDeal[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const deal of deals) {
    const entered = dayKey(deal.dateEntered || deal.createdTime);
    if (entered) {
      events.push({
        id: `${deal.id}-in`,
        title: `Entrée pipeline · ${deal.name}`,
        startupId: deal.id,
        startup: deal.name,
        date: entered,
        kind: funnelStage(deal) === "closed" ? "portfolio" : "pipeline",
      });
    }
    const updated = dayKey(deal.dateUpdated);
    if (updated && updated !== entered) {
      events.push({
        id: `${deal.id}-up`,
        title: `Mise à jour · ${deal.name}`,
        startupId: deal.id,
        startup: deal.name,
        date: updated,
        kind: funnelStage(deal) === "diligence" ? "diligence" : funnelStage(deal) === "ic" ? "ic" : "pipeline",
      });
    }
    if (deal.termSheetUrl && updated) {
      events.push({
        id: `${deal.id}-ts`,
        title: `Term sheet · ${deal.name}`,
        startupId: deal.id,
        startup: deal.name,
        date: updated,
        kind: "ic",
      });
    }
  }
  return events;
}

export function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

export function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}
