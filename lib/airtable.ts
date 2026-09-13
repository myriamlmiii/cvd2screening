/* ============================================================
   Data access for the SITUATIONS Airtable base.

   - If AIRTABLE_TOKEN is set, read live from the Airtable REST
     API (revalidated every 5 min).
   - Otherwise fall back to the committed snapshot at
     data/airtable-snapshot.json (run `npm run sync` to refresh
     it once a token is available).

   Nothing here fabricates data. Empty / "N/A" cells become null.
   ============================================================ */

import { cache } from "react";
import snapshotJson from "@/data/airtable-snapshot.json";
import type { PipelineDeal, PortfolioCompany, Snapshot } from "@/types";

export const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appb9A3NOEb76UQaJ";
const PIPELINE_TABLE = "tblRoZitopWuaCwdA";
const PORTFOLIO_TABLE = "tbl9QgF2B2dkUgpW1";
const REVALIDATE_SECONDS = 300;

/* fieldId -> normalised key. Kept in sync with scripts/sync-airtable.mjs. */
export const PIPELINE_FIELDS: Record<string, keyof PipelineDeal> = {
  fldu4ktuYyt06rkLH: "name",
  flduIxMgylChkQN7x: "dateEntered",
  fldBf4sJIlHWZKOV5: "fundingSought",
  fldUCbVIrDSAkBaiL: "description",
  fldlYWfrEvpyOQygd: "pitchUrl",
  fldE6nFOiuLat63sb: "ficheUrl",
  fld3L3gwehqazATbZ: "sector",
  fldzrdA7SqZWyk9uK: "country",
  fldGTtrwJ4TS2TJiQ: "status",
  fldVcoUZbX9YyE0Mr: "dateUpdated",
  fldM3zEn5YJ3XAdIB: "update",
  fldcc5Jw7JUffe53B: "bpUrl",
  fldE93lqhr3Zo48BT: "benchmarkUrl",
  fld8kxY0xtI5MqT6z: "demoUrl",
  fldwI7WVc4oAGMt0x: "valuation",
  fldSJXK3AINGKKTND: "investors",
  fld2j3c1mY7KIZkJm: "websiteUrl",
  fldXE46xxITdkr2Ni: "marketStudyUrl",
  fldTy4r6PVF54ky6H: "founder",
  fldtVTIy4BKIiFf8q: "email",
  fldJZdqoVYqmkFiWJ: "whatsapp",
  fldA8Npwng6Ilbzyp: "ndaUrl",
  fldUeadFyWw4c1J3S: "termSheetUrl",
  fldlPPVFHH0OTBHiE: "dossierUrl",
  fldc9U7PYIphQenpI: "source",
};

export const PORTFOLIO_FIELDS: Record<string, keyof PortfolioCompany> = {
  fldMaO9PLYT74uGQY: "name",
  fldgTXUXeJm2tH8Zi: "situation",
  fldldkD5rUH0jeMUq: "sector",
  fldRTuXG53gMiY2db: "country",
  fldYMoJZqljbYdSYj: "round",
  fldYFGyftcrwAAz9m: "investDate",
  fldyKjJTGASCU9Mgf: "investCvd",
  fldDk2legMqogmQu1: "investHolmarcom",
  fld0fXTvWJRVsIXok: "pctCvd",
  fldg3Xn1vC6BNzyUb: "pctHolmarcom",
  fldym1lPQ1yBNhQ6p: "pctTotal",
  fld6Jm54nYTp3oPyo: "position",
  fldIcL1mdptoIUL5H: "instrument",
  fldiDTpjvxOJWICZX: "valoInitial",
  fldIBVP2fIFRejY7Q: "valoFinal",
  fld9nQvYCOo6sBgWv: "exchanges",
  fldYDI3STxjPBm0kb: "negotiationPoints",
  fldWyE2nv720dKWbC: "ficheUrl",
  fldDh6ieUkhEDfA15: "dossierUrl",
  flduBbuoblG7ASg89: "source",
  fld7t9pTKEBHUYKzk: "unexpectedEvents",
  fldyTymH1NRNOLmWF: "mrrBeforeInvest",
  fldrjicmUyK13qji8: "mrrTargetDec26",
  fldIfxobkZ69cN5Qe: "monthlyBurn",
  fldaM5IHa9EDVj5pi: "revenueFy2025",
  fldmhCazE1FGUZ4Sq: "ebitdaFy2025",
  fldMpGXRknClqlEBI: "runwayEnd",
  fldSxDv7DaXzVsEAS: "nextRound",
};

const BLANK = new Set(["", "n/a", "na", "n.a.", "n/d", "nd", "/", "-", "--", "—", "\\", ".", "tbd", "?"]);

function asName(value: unknown): string {
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return name == null ? "" : String(name);
  }
  return "";
}

export function clean(value: unknown): string | null {
  if (value == null) return null;
  let v: unknown = value;
  if (Array.isArray(v)) v = v.map((x) => (typeof x === "object" && x ? asName(x) : x)).join(", ");
  if (typeof v === "object") v = asName(v);
  let s = String(v).replace(/\r\n/g, "\n").trim();
  s = s.replace(/\n{3,}/g, "\n\n");
  if (BLANK.has(s.toLowerCase().replace(/^[*_ ]+|[*_ ]+$/g, ""))) return null;
  return s || null;
}

function mapRecord<T>(
  rec: { id: string; createdTime?: string; fields: Record<string, unknown> },
  fields: Record<string, string>,
): T {
  const out: Record<string, unknown> = { id: rec.id, createdTime: rec.createdTime ?? null };
  for (const [fid, key] of Object.entries(fields)) out[key] = clean(rec.fields[fid]);
  return out as T;
}

type AirtableRecord = { id: string; createdTime?: string; fields: Record<string, unknown> };

async function fetchTable(table: string, token: string): Promise<AirtableRecord[]> {
  const base = process.env.AIRTABLE_BASE_ID || AIRTABLE_BASE_ID;
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${base}/${table}`);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("returnFieldsByFieldId", "true");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) throw new Error(`Airtable ${table} ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { records: AirtableRecord[]; offset?: string };
    records.push(...json.records);
    offset = json.offset;
  } while (offset);
  return records;
}

function fromSnapshot(): Snapshot {
  const s = snapshotJson as unknown as Omit<Snapshot, "live">;
  return { ...s, live: false };
}

async function fromApi(token: string): Promise<Snapshot> {
  const [pipeRaw, portRaw] = await Promise.all([
    fetchTable(PIPELINE_TABLE, token),
    fetchTable(PORTFOLIO_TABLE, token),
  ]);
  const pipeline = pipeRaw
    .map((r) => mapRecord<PipelineDeal>(r, PIPELINE_FIELDS))
    .filter((d) => d.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  const portfolio = portRaw
    .map((r) => mapRecord<PortfolioCompany>(r, PORTFOLIO_FIELDS))
    .filter((c) => c.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    syncedAt: new Date().toISOString(),
    source: `airtable:SITUATIONS (${process.env.AIRTABLE_BASE_ID || AIRTABLE_BASE_ID})`,
    live: true,
    pipeline,
    portfolio,
  };
}

let skipLiveUntil = 0;

/** Cached per request. Visitors always get the snapshot if live Airtable is down — no admin login required. */
export const getSnapshot = cache(async (): Promise<Snapshot> => {
  const token = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
  if (!token || Date.now() < skipLiveUntil) return fromSnapshot();
  try {
    return await fromApi(token);
  } catch (err) {
    skipLiveUntil = Date.now() + 30 * 60_000;
    if (process.env.NODE_ENV === "development") {
      console.warn("[airtable] live unavailable, serving snapshot for all visitors");
    } else {
      console.warn("[airtable] live fetch failed, using snapshot:", err instanceof Error ? err.message : "error");
    }
    return fromSnapshot();
  }
});

export async function getPipeline(): Promise<PipelineDeal[]> {
  return (await getSnapshot()).pipeline;
}
export async function getPortfolio(): Promise<PortfolioCompany[]> {
  return (await getSnapshot()).portfolio;
}
export async function getDeal(id: string): Promise<PipelineDeal | undefined> {
  return (await getPipeline()).find((d) => d.id === id);
}
export async function getCompany(id: string): Promise<PortfolioCompany | undefined> {
  return (await getPortfolio()).find((c) => c.id === id);
}

/* --------------------------- derived helpers --------------------------- */

export function statusTone(status: string | null): "positive" | "warning" | "critical" | "info" | "neutral" {
  switch ((status || "").toLowerCase()) {
    case "portfolio":
      return "positive";
    case "opportunité future":
    case "shortlistée":
      return "info";
    case "en étude":
    case "à contacter":
      return "warning";
    case "déclinée":
      return "critical";
    default:
      return "neutral";
  }
}

export function statusBadgeClass(status: string | null): string {
  switch (statusTone(status)) {
    case "positive":
      return "bg-[#1f7a4a] text-white";
    case "critical":
      return "bg-[#b42318] text-white";
    case "warning":
      return "bg-[#8a5a10] text-white";
    case "info":
      return "bg-[#2f5a86] text-white";
    default:
      return "bg-[#2f3d4d] text-white";
  }
}

export { countBy } from "@/lib/count-by";

/** Best-effort parse of a "200 K€" / "1,5 M€" / "500 K$" style money string to a EUR-ish number. */
export function parseMoney(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.replace(/\s/g, "").match(/([\d.,]+)\s*([kmM])?/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  if (Number.isNaN(n)) return null;
  const unit = (m[2] || "").toLowerCase();
  if (unit === "k") n *= 1_000;
  if (unit === "m") n *= 1_000_000;
  return n;
}
