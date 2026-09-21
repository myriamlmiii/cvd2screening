import type { PortfolioCompany } from "@/types";

const ISO: Record<string, { code: string; fr: string; en: string }> = {
  fr: { code: "fr", fr: "France", en: "France" },
  france: { code: "fr", fr: "France", en: "France" },
  ma: { code: "ma", fr: "Maroc", en: "Morocco" },
  maroc: { code: "ma", fr: "Maroc", en: "Morocco" },
  morocco: { code: "ma", fr: "Maroc", en: "Morocco" },
  ae: { code: "ae", fr: "EAU", en: "UAE" },
  eau: { code: "ae", fr: "EAU", en: "UAE" },
  uae: { code: "ae", fr: "EAU", en: "UAE" },
  emirat: { code: "ae", fr: "EAU", en: "UAE" },
  dubai: { code: "ae", fr: "EAU", en: "UAE" },
  us: { code: "us", fr: "États-Unis", en: "United States" },
  usa: { code: "us", fr: "États-Unis", en: "United States" },
  "united states": { code: "us", fr: "États-Unis", en: "United States" },
  gb: { code: "gb", fr: "Royaume-Uni", en: "United Kingdom" },
  uk: { code: "gb", fr: "Royaume-Uni", en: "United Kingdom" },
  ng: { code: "ng", fr: "Nigéria", en: "Nigeria" },
  nigéria: { code: "ng", fr: "Nigéria", en: "Nigeria" },
  nigeria: { code: "ng", fr: "Nigéria", en: "Nigeria" },
  tn: { code: "tn", fr: "Tunisie", en: "Tunisia" },
  tunisie: { code: "tn", fr: "Tunisie", en: "Tunisia" },
  tunisia: { code: "tn", fr: "Tunisie", en: "Tunisia" },
  ci: { code: "ci", fr: "Côte d'Ivoire", en: "Ivory Coast" },
  "côte d'ivoire": { code: "ci", fr: "Côte d'Ivoire", en: "Ivory Coast" },
  in: { code: "in", fr: "Inde", en: "India" },
  india: { code: "in", fr: "Inde", en: "India" },
  inde: { code: "in", fr: "Inde", en: "India" },
  ke: { code: "ke", fr: "Kenya", en: "Kenya" },
  kenya: { code: "ke", fr: "Kenya", en: "Kenya" },
  gh: { code: "gh", fr: "Ghana", en: "Ghana" },
  ghana: { code: "gh", fr: "Ghana", en: "Ghana" },
  ca: { code: "ca", fr: "Canada", en: "Canada" },
  canada: { code: "ca", fr: "Canada", en: "Canada" },
  il: { code: "il", fr: "Israël", en: "Israel" },
  israel: { code: "il", fr: "Israël", en: "Israel" },
  mx: { code: "mx", fr: "Mexique", en: "Mexico" },
  mexique: { code: "mx", fr: "Mexique", en: "Mexico" },
  pl: { code: "pl", fr: "Pologne", en: "Poland" },
  pologne: { code: "pl", fr: "Pologne", en: "Poland" },
  at: { code: "at", fr: "Autriche", en: "Austria" },
  autriche: { code: "at", fr: "Autriche", en: "Austria" },
  sn: { code: "sn", fr: "Sénégal", en: "Senegal" },
  sénégal: { code: "sn", fr: "Sénégal", en: "Senegal" },
  senegal: { code: "sn", fr: "Sénégal", en: "Senegal" },
};

export function formatCountry(raw: string | null | undefined, locale: "fr" | "en" = "fr"): { code: string | null; name: string } {
  if (!raw) return { code: null, name: "—" };
  const compact = raw.replace(/\r/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  const pieces = compact.split(/[|/·,]+/).map((s) => s.trim()).filter(Boolean);
  const last = pieces[pieces.length - 1] || compact;
  const key = last.toLowerCase();
  const hit = ISO[key] || ISO[key.slice(0, 2)];
  if (hit) return { code: hit.code, name: locale === "en" ? hit.en : hit.fr };
  const iso2 = compact.match(/\b([A-Z]{2})\b/);
  if (iso2 && ISO[iso2[1].toLowerCase()]) {
    const mapped = ISO[iso2[1].toLowerCase()];
    return { code: mapped.code, name: locale === "en" ? mapped.en : mapped.fr };
  }
  return { code: null, name: last };
}

export function parseEuroAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const m = cleaned.match(/([\d]+(?:[.,]\d+)?)\s*([kKmM])?(?:\s*)([€$]|eur|usd|mad)?/i);
  if (!m) return null;
  const base = Number(m[1].replace(",", "."));
  if (!Number.isFinite(base)) return null;
  const unit = (m[2] || "").toLowerCase();
  if (unit === "k") return base * 1_000;
  if (unit === "m") return base * 1_000_000;
  if (/k€|k\$/i.test(cleaned) && base < 10_000) return base * 1_000;
  return base;
}

export function parsePct(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const nums = [...raw.matchAll(/([\d]+(?:[.,]\d+)?)\s*%/g)].map((m) => Number(m[1].replace(",", "."))).filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return avg / 100;
}

export function stakeValue(company: Pick<PortfolioCompany, "valoFinal" | "valoInitial" | "pctCvd" | "pctTotal">): number | null {
  const valo = parseEuroAmount(company.valoFinal) ?? parseEuroAmount(company.valoInitial);
  const pct = parsePct(company.pctCvd) ?? parsePct(company.pctTotal);
  if (valo == null || pct == null) return null;
  return valo * pct;
}

export function rowMultiple(company: Pick<PortfolioCompany, "investCvd" | "valoFinal" | "valoInitial" | "pctCvd" | "pctTotal">): number | null {
  const invested = parseEuroAmount(company.investCvd);
  const value = stakeValue(company);
  if (invested == null || invested <= 0 || value == null) return null;
  return value / invested;
}

export function investYear(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/(20\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 2000 && y <= 2100 ? y : null;
}

export function formatMoneyField(raw: string | null | undefined): string {
  if (!raw) return "—";
  let s = raw.replace(/\s+/g, " ").trim();
  s = s.replace(/Décote\s*(\d)/gi, "Décote $1");
  s = s.replace(/decote(\d)/gi, "Décote $1");
  s = s.replace(/\s*,\s*/g, ", ");
  s = s.replace(/\s*-\s*/g, " – ");
  s = s.replace(/\s+à\s+/gi, " – ");
  return s;
}

export function formatMultiple(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1).replace(".", ",")}x`;
}
