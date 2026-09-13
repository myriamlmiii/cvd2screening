/* ============================================================
   Parses the real, messy FINANCEMENT RECHERCHÉ / ASK free-text
   field into structured data. Real examples from the base:

     "1,5M USD pour 19% (Seed)"
     "[cherche 1M$ en equity pour 20%]"
     "** **[cherche à lever 3 M€]"
     "[a levé 2.5M$ auprès de InnovX]"
     "[cherche à lever 25 mDH pour 10%]"
     "N/D"

   Never shown raw (brackets, "** **" markdown artifacts and all) —
   always parsed into amount/currency/percentage/round where
   possible, and falls back to a cleaned (not raw) string otherwise.
   ============================================================ */

export type FundingKind = "seeking" | "raised" | "unknown";

export interface ParsedFunding {
  raw: string;
  disclosed: boolean;
  kind: FundingKind;
  amount: number | null;
  currency: string | null; // "USD" | "EUR" | "MAD" | "CAD"
  percentage: number | null;
  round: string | null;
  /** Cleaned fallback text (brackets/markdown stripped) for when amount can't be parsed. */
  clean: string;
}

const CURRENCY_TOKENS: { re: RegExp; currency: string; impliedMillions?: boolean; impliedThousands?: boolean }[] = [
  { re: /MMAD/i, currency: "MAD", impliedMillions: true },
  { re: /m\s?DH/i, currency: "MAD", impliedMillions: true },
  { re: /k\s?DH/i, currency: "MAD", impliedThousands: true },
  { re: /\$\s?CAN/i, currency: "CAD" },
  { re: /CHF/i, currency: "CHF" },
  { re: /GBP/i, currency: "GBP" },
  { re: /USD/i, currency: "USD" },
  { re: /EUR/i, currency: "EUR" },
  { re: /CAD/i, currency: "CAD" },
  { re: /MAD/i, currency: "MAD" },
  { re: /\$/, currency: "USD" },
  { re: /€/, currency: "EUR" },
  { re: /£/, currency: "GBP" },
];

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  MAD: "MAD",
  CAD: "CA$",
  GBP: "£",
  CHF: "CHF",
};

function stripArtifacts(raw: string): string {
  return raw
    .replace(/\*\*\s*\*\*/g, "") // "** **" markdown-bold leftovers
    .replace(/^\s*\[|\]\s*$/g, "") // wrapping brackets
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseAmount(text: string): { amount: number; currency: string } | null {
  for (const token of CURRENCY_TOKENS) {
    // number, optional k/M multiplier, then this currency token — in that order,
    // with up to a few characters of whitespace/punctuation between each
    const re = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(k|K|m|M)?\\s*(?:${token.re.source})`, token.re.flags.includes("i") ? "i" : "");
    const m = re.exec(text);
    if (!m) continue;
    const n = parseFloat(m[1].replace(",", "."));
    if (Number.isNaN(n)) continue;
    const unit = (m[2] || "").toLowerCase();
    let multiplier = 1;
    if (unit === "k") multiplier = 1_000;
    else if (unit === "m") multiplier = 1_000_000;
    else if (token.impliedMillions) multiplier = 1_000_000;
    else if (token.impliedThousands) multiplier = 1_000;
    return { amount: n * multiplier, currency: token.currency };
  }
  return null;
}

export function parseFunding(raw: string | null): ParsedFunding | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const clean = stripArtifacts(trimmed);

  if (/^N\s*\/\s*D\b/i.test(clean)) {
    return { raw: trimmed, disclosed: false, kind: "unknown", amount: null, currency: null, percentage: null, round: null, clean: "" };
  }

  const kind: FundingKind = /cherch/i.test(clean) ? "seeking" : /a\s+lev[ée]|lev[ée]e?\b/i.test(clean) ? "raised" : "unknown";

  const parsedAmount = parseAmount(clean);
  const pctMatch = /pour\s+(\d+(?:[.,]\d+)?)\s*%/i.exec(clean);
  const percentage = pctMatch ? parseFloat(pctMatch[1].replace(",", ".")) : null;
  const roundMatch = /\(([^)]+)\)\s*$/.exec(trimmed);

  return {
    raw: trimmed,
    disclosed: true,
    kind,
    amount: parsedAmount?.amount ?? null,
    currency: parsedAmount?.currency ?? null,
    percentage,
    round: roundMatch ? roundMatch[1].trim() : null,
    clean,
  };
}

function formatAmount(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const abs = Math.abs(amount);
  const short = abs >= 1_000_000 ? `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M` : abs >= 1_000 ? `${(amount / 1_000).toFixed(0)}K` : `${amount}`;
  return currency === "MAD" || currency === "CAD" || currency === "CHF" ? `${short} ${sym}` : `${sym}${short}`;
}

/** Human summary, e.g. "Seeking $1M · 20% equity" / "Recherche 1M$ · 20% capital". */
export function formatFunding(parsed: ParsedFunding | null, locale: "en" | "fr" = "en"): string {
  if (!parsed) return "—";
  if (!parsed.disclosed) return locale === "fr" ? "Non communiqué" : "Not disclosed";

  if (parsed.amount != null && parsed.currency) {
    const amountStr = formatAmount(parsed.amount, parsed.currency);
    const kindLabel =
      parsed.kind === "raised"
        ? locale === "fr"
          ? "Levé"
          : "Raised"
        : locale === "fr"
          ? "Recherche"
          : "Seeking";
    const parts = [`${kindLabel} ${amountStr}`];
    if (parsed.percentage != null) {
      parts.push(locale === "fr" ? `${parsed.percentage}% capital` : `${parsed.percentage}% equity`);
    }
    if (parsed.round) parts.push(parsed.round);
    return parts.join(" · ");
  }

  return parsed.clean || (locale === "fr" ? "Non communiqué" : "Not disclosed");
}
