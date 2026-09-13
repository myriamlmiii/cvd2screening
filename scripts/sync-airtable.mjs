#!/usr/bin/env node
/* Refresh data/airtable-snapshot.json from the SITUATIONS base.
   Requires AIRTABLE_TOKEN (a Personal Access Token with data.records:read
   on the base). Reads it from the environment or from .env.local.

   Usage:  npm run sync
*/
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- load .env.local (KEY=VALUE, ignores quotes/comments) -------------------
for (const file of [".env.local", ".env"]) {
  const p = join(ROOT, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
const BASE = process.env.AIRTABLE_BASE_ID || "appb9A3NOEb76UQaJ";
if (!TOKEN) {
  console.error("Missing AIRTABLE_TOKEN. Add it to .env.local:\n  AIRTABLE_TOKEN=pat_xxx");
  process.exit(1);
}

const PIPELINE_TABLE = "tblRoZitopWuaCwdA";
const PORTFOLIO_TABLE = "tbl9QgF2B2dkUgpW1";

const PIPELINE_FIELDS = {
  fldu4ktuYyt06rkLH: "name", flduIxMgylChkQN7x: "dateEntered", fldBf4sJIlHWZKOV5: "fundingSought",
  fldUCbVIrDSAkBaiL: "description", fldlYWfrEvpyOQygd: "pitchUrl", fldE6nFOiuLat63sb: "ficheUrl",
  fld3L3gwehqazATbZ: "sector", fldzrdA7SqZWyk9uK: "country", fldGTtrwJ4TS2TJiQ: "status",
  fldVcoUZbX9YyE0Mr: "dateUpdated", fldM3zEn5YJ3XAdIB: "update", fldcc5Jw7JUffe53B: "bpUrl",
  fldE93lqhr3Zo48BT: "benchmarkUrl", fld8kxY0xtI5MqT6z: "demoUrl", fldwI7WVc4oAGMt0x: "valuation",
  fldSJXK3AINGKKTND: "investors", fld2j3c1mY7KIZkJm: "websiteUrl", fldXE46xxITdkr2Ni: "marketStudyUrl",
  fldTy4r6PVF54ky6H: "founder", fldtVTIy4BKIiFf8q: "email", fldJZdqoVYqmkFiWJ: "whatsapp",
  fldA8Npwng6Ilbzyp: "ndaUrl", fldUeadFyWw4c1J3S: "termSheetUrl", fldlPPVFHH0OTBHiE: "dossierUrl",
  fldc9U7PYIphQenpI: "source",
};
const PORTFOLIO_FIELDS = {
  fldMaO9PLYT74uGQY: "name", fldgTXUXeJm2tH8Zi: "situation", fldldkD5rUH0jeMUq: "sector",
  fldRTuXG53gMiY2db: "country", fldYMoJZqljbYdSYj: "round", fldYFGyftcrwAAz9m: "investDate",
  fldyKjJTGASCU9Mgf: "investCvd", fldDk2legMqogmQu1: "investHolmarcom", fld0fXTvWJRVsIXok: "pctCvd",
  fldg3Xn1vC6BNzyUb: "pctHolmarcom", fldym1lPQ1yBNhQ6p: "pctTotal", fld6Jm54nYTp3oPyo: "position",
  fldIcL1mdptoIUL5H: "instrument", fldiDTpjvxOJWICZX: "valoInitial", fldIBVP2fIFRejY7Q: "valoFinal",
  fld9nQvYCOo6sBgWv: "exchanges", fldYDI3STxjPBm0kb: "negotiationPoints", fldWyE2nv720dKWbC: "ficheUrl",
  fldDh6ieUkhEDfA15: "dossierUrl", flduBbuoblG7ASg89: "source", fld7t9pTKEBHUYKzk: "unexpectedEvents",
  fldyTymH1NRNOLmWF: "mrrBeforeInvest", fldrjicmUyK13qji8: "mrrTargetDec26", fldIfxobkZ69cN5Qe: "monthlyBurn",
  fldaM5IHa9EDVj5pi: "revenueFy2025", fldmhCazE1FGUZ4Sq: "ebitdaFy2025", fldMpGXRknClqlEBI: "runwayEnd",
  fldSxDv7DaXzVsEAS: "nextRound",
};

const BLANK = new Set(["", "n/a", "na", "n.a.", "n/d", "nd", "/", "-", "--", "—", "\\", ".", "tbd", "?"]);
function clean(v) {
  if (v == null) return null;
  if (Array.isArray(v)) v = v.map((x) => (x && typeof x === "object" ? x.name ?? "" : x)).join(", ");
  if (typeof v === "object") v = v.name ?? "";
  let s = String(v).replace(/\r\n/g, "\n").trim().replace(/\n{3,}/g, "\n\n");
  if (BLANK.has(s.toLowerCase().replace(/^[*_ ]+|[*_ ]+$/g, ""))) return null;
  return s || null;
}

async function fetchTable(table) {
  const rows = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE}/${table}`);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("returnFieldsByFieldId", "true");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) throw new Error(`${table} ${res.status}: ${await res.text()}`);
    const json = await res.json();
    rows.push(...json.records);
    offset = json.offset;
  } while (offset);
  return rows;
}

function map(rows, fields) {
  return rows
    .map((r) => {
      const o = { id: r.id, createdTime: r.createdTime ?? null };
      for (const [fid, key] of Object.entries(fields)) o[key] = clean(r.fields[fid]);
      return o;
    })
    .filter((o) => o.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

const [pipe, port] = await Promise.all([fetchTable(PIPELINE_TABLE), fetchTable(PORTFOLIO_TABLE)]);
const snapshot = {
  syncedAt: new Date().toISOString(),
  source: `airtable:SITUATIONS (${BASE})`,
  pipeline: map(pipe, PIPELINE_FIELDS),
  portfolio: map(port, PORTFOLIO_FIELDS),
};
writeFileSync(join(ROOT, "data", "airtable-snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n");
console.log(`Wrote data/airtable-snapshot.json — ${snapshot.pipeline.length} pipeline, ${snapshot.portfolio.length} portfolio`);
