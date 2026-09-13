import type { CanonicalCrmStatus, NormalizedStartup, RawSourceRecord, StartupSourceType } from "@/lib/domain/crm";
import { contentHash, normalizeDomain, normalizeFunding, normalizeName, normalizeUrl } from "@/lib/normalize";
import { z } from "zod";

const rawSchema = z.object({
  sourceType: z.string(),
  sourceName: z.string(),
  externalId: z.string().min(1),
  sourceUrl: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
  modifiedAt: z.string().nullable().optional(),
});

function str(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(", ") || null;
  if (typeof v === "object" && "name" in (v as object)) return str((v as { name?: unknown }).name);
  return String(v).trim() || null;
}

function pick(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    if (key in payload) {
      const v = str(payload[key]);
      if (v) return v;
    }
    const found = Object.entries(payload).find(([k]) => k.toLowerCase() === key.toLowerCase());
    if (found) {
      const v = str(found[1]);
      if (v) return v;
    }
  }
  return null;
}

export function mapAirtableStatus(status: string | null): CanonicalCrmStatus {
  const st = (status || "").toLowerCase();
  if (st === "déclinée" || st === "declinee" || st === "passed") return "Passed";
  if (st === "shortlistée" || st === "shortlistee" || st === "opportunité future" || st === "shortlisted") return "Shortlisted";
  if (st === "en étude" || st === "en etude" || st === "review" || st === "reviewing") return "Review";
  if (st === "screening") return "Screening";
  if (st === "en observation") return "En Observation";
  if (st === "à contacter" || st === "a contacter" || st === "new" || !status) return "New";
  if (st === "portfolio" || st === "selected") return "Shortlisted";
  return "En Observation";
}

export function normalizeRawRecord(raw: RawSourceRecord): NormalizedStartup {
  const parsed = rawSchema.parse(raw);
  const p = parsed.payload;
  const name = pick(p, ["name", "company", "startup", "NOM"]) || "Untitled startup";
  const website = pick(p, ["website", "websiteUrl", "url", "site"]);
  const description = pick(p, ["description", "product", "summary"]);
  const sector = pick(p, ["sector", "industry"]);
  const country = pick(p, ["country", "geography", "geo"]);
  const founders = pick(p, ["founder", "founders", "team"]);
  const fundingRaw = pick(p, ["fundingSought", "funding", "ask"]);
  const funding = normalizeFunding(fundingRaw);
  const dateReceived = pick(p, ["dateEntered", "date_received", "createdTime"]);
  const status = pick(p, ["status", "crm_status"]);
  return {
    name,
    normalizedName: normalizeName(name),
    description,
    website: normalizeUrl(website),
    normalizedDomain: normalizeDomain(website),
    sector,
    stage: pick(p, ["stage", "round"]),
    country,
    founders,
    fundingRaw,
    fundingTotal: funding.amount,
    fundingCurrency: funding.currency,
    sourceType: parsed.sourceType as StartupSourceType,
    dateReceived,
    crmStatus: mapAirtableStatus(status),
    contentHash: contentHash([name, description, website, sector, country, founders, fundingRaw, status]),
  };
}
