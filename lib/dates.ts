import { format, formatDistanceToNow, isToday, isTomorrow, isValid, isYesterday, parseISO } from "date-fns";
import { enUS, fr } from "date-fns/locale";

export type DateLocale = "fr" | "en";

function loc(locale: DateLocale = "fr") {
  return locale === "en" ? enUS : fr;
}

function asDate(iso: string | Date | null | undefined): Date | null {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : parseISO(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return isValid(d) ? d : iso instanceof Date ? null : Number.isFinite(new Date(iso).getTime()) ? new Date(iso) : null;
}

/** e.g. "16 sept. 2026" / "16 Sep 2026" */
export function formatAppDate(iso: string | Date | null | undefined, locale: DateLocale = "fr") {
  const d = asDate(iso);
  if (!d) return iso ? String(iso) : "—";
  return format(d, "d MMM yyyy", { locale: loc(locale) });
}

/** e.g. "Mardi 16 septembre 2026" */
export function formatHeaderDate(d = new Date(), locale: DateLocale = "fr") {
  return format(d, "d MMM yyyy", { locale: loc(locale) });
}

export function relativeDate(iso: string | Date | null | undefined, locale: DateLocale = "fr") {
  const d = asDate(iso);
  if (!d) return iso ? String(iso) : "—";
  if (isToday(d)) return locale === "en" ? "Today" : "Aujourd'hui";
  if (isYesterday(d)) return locale === "en" ? "Yesterday" : "Hier";
  if (isTomorrow(d)) return locale === "en" ? "Tomorrow" : "Demain";
  return formatDistanceToNow(d, { addSuffix: true, locale: loc(locale) });
}

export const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 1,
});

export const eurCompact = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatEuro(value: number | null | undefined, fallback = "—") {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.abs(value) >= 1_000 ? eurCompact.format(value) : eur.format(value);
}
