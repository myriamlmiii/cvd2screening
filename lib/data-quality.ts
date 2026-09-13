export type Completeness = { pct: number; missing: string[] };

const FIELDS: { key: string; present: (v: Record<string, string | null | undefined>) => boolean }[] = [
  { key: "name", present: (v) => Boolean(v.name) },
  { key: "website", present: (v) => Boolean(v.website) },
  { key: "description", present: (v) => Boolean(v.description) },
  { key: "sector", present: (v) => Boolean(v.sector) },
  { key: "stage", present: (v) => Boolean(v.stage) },
  { key: "geography", present: (v) => Boolean(v.country) },
  { key: "founders", present: (v) => Boolean(v.founders) },
  { key: "product", present: (v) => Boolean(v.description) },
  { key: "traction", present: (v) => Boolean(v.traction) },
  { key: "market", present: (v) => Boolean(v.market) },
  { key: "funding", present: (v) => Boolean(v.funding) },
];

/** Missing fields are unknown, not negative quality. */
export function dataCompleteness(input: {
  name?: string | null;
  website?: string | null;
  description?: string | null;
  sector?: string | null;
  stage?: string | null;
  country?: string | null;
  founders?: string | null;
  traction?: string | null;
  market?: string | null;
  funding?: string | null;
}): Completeness {
  const missing: string[] = [];
  let present = 0;
  for (const f of FIELDS) {
    if (f.present(input)) present += 1;
    else missing.push(f.key);
  }
  return { pct: Math.round((present / FIELDS.length) * 100), missing };
}
