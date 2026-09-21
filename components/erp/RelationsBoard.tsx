"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Database, Handshake, Network, Plus, Search, User, Users } from "lucide-react";
import { Mark, PageHeader, StatCard, StatusChip, CountryCell } from "@/components/erp/ui";
import { Button } from "@/components/ui/Button";
import { ErpOverlay } from "@/components/erp/Overlay";
import { useLocale } from "@/lib/i18n";
import { localizePhrase } from "@/lib/erp/labels";
import { formatAppDate } from "@/lib/dates";
import type { RelationsPayload } from "@/lib/erp/payloads";

const TONE = {
  Fondateur: "green" as const,
  Investisseur: "violet" as const,
  Partenaire: "amber" as const,
  CEO: "blue" as const,
};

export function RelationsBoard({ data }: { data: RelationsPayload }) {
  const { t, locale } = useLocale();
  const L = (s: string) => localizePhrase(locale, s);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [country, setCountry] = useState("all");
  const [startup, setStartup] = useState("all");
  const [note, setNote] = useState(false);
  const countries = useMemo(() => [...new Set(data.contacts.map((c) => c.country).filter(Boolean))] as string[], [data.contacts]);
  const startups = useMemo(() => [...new Set(data.contacts.map((c) => c.startup))], [data.contacts]);
  const rows = useMemo(() => {
    return data.contacts.filter((c) => {
      if (kind !== "all" && c.kind !== kind) return false;
      if (country !== "all" && c.country !== country) return false;
      if (startup !== "all" && c.startup !== startup) return false;
      if (!q.trim()) return true;
      return [c.name, c.organization, c.startup, c.country].join(" ").toLowerCase().includes(q.trim().toLowerCase());
    });
  }, [data.contacts, q, kind, country, startup]);

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={t("erp.relTitle")}
        subtitle={t("erp.relSubtitle")}
        action={<Button onClick={() => setNote(true)}><Plus className="h-4 w-4" /> {t("erp.relAdd")}</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <button type="button" onClick={() => setKind("all")}>
          <StatCard icon={<Users className="h-4 w-4" />} value={String(data.totals.all)} label={t("erp.relContacts")} selected={kind === "all"} />
        </button>
        <button type="button" onClick={() => setKind("Fondateur")}>
          <StatCard icon={<User className="h-4 w-4" />} value={String(data.totals.founders)} label={t("erp.relFounders")} selected={kind === "Fondateur"} />
        </button>
        <button type="button" onClick={() => setKind("Investisseur")}>
          <StatCard icon={<Database className="h-4 w-4" />} value={String(data.totals.investors)} label={t("erp.relInvestors")} selected={kind === "Investisseur"} />
        </button>
        <button type="button" onClick={() => setKind("Partenaire")}>
          <StatCard icon={<Handshake className="h-4 w-4" />} value={String(data.totals.partners)} label={t("erp.relPartners")} selected={kind === "Partenaire"} />
        </button>
        <StatCard icon={<Network className="h-4 w-4" />} value="—" label={t("erp.relIntros")} iconClass="bg-[#EDE9FE] text-[#7c3aed]" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px]">
          <Search className="h-4 w-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("erp.relSearch")} className="w-full outline-none" />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 rounded-lg border border-line px-2 text-[13px]">
          <option value="all">{t("erp.typeAll")}</option>
          <option value="Fondateur">{t("erp.founder")}</option>
          <option value="Investisseur">{t("erp.investor")}</option>
          <option value="Partenaire">{t("erp.relPartners")}</option>
        </select>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-9 rounded-lg border border-line px-2 text-[13px]">
          <option value="all">{t("erp.countryAll")}</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={startup} onChange={(e) => setStartup(e.target.value)} className="h-9 rounded-lg border border-line px-2 text-[13px]">
          <option value="all">{t("erp.linkedStartupAll")}</option>
          {startups.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="button" className="text-[13px] text-[#2563EB]" onClick={() => { setQ(""); setKind("all"); setCountry("all"); setStartup("all"); }}>{t("erp.reset")}</button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <section className="erp-card overflow-hidden">
          <table className="erp-table w-full">
            <thead>
              <tr>
                <th>{t("erp.relContact")}</th>
                <th>{t("erp.relOrg")}</th>
                <th>{t("erp.relType")}</th>
                <th>{t("erp.relLinked")}</th>
                <th>{t("erp.country")}</th>
                <th>{t("erp.relLast")}</th>
                <th>{t("erp.relNext")}</th>
                <th>{t("erp.relOwner")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-ink-3">{t("erp.relEmpty")}</td>
                </tr>
              ) : rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-2 font-semibold">
                      <Mark name={c.name} className="h-8 w-8 rounded-full" />
                      {c.name}
                    </div>
                  </td>
                  <td>{c.organization}</td>
                  <td><StatusChip label={L(c.kind)} tone={TONE[c.kind]} /></td>
                  <td><Link href={`/pipeline/${c.startupId}`} className="text-[#2563EB]">{c.startup}</Link></td>
                  <td><CountryCell country={c.country} /></td>
                  <td>{formatAppDate(c.lastTouch, locale)}</td>
                  <td>{L(c.nextAction)}</td>
                  <td>—</td>
                  <td><Link href={`/pipeline/${c.startupId}`}><ChevronRight className="h-4 w-4 text-ink-3" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="space-y-4">
          <div className="erp-card p-4">
            <h3 className="mb-3 text-[13px] font-semibold">{t("erp.relRecent")}</h3>
            <ul className="space-y-2">
              {data.recent.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-[13px]">
                  <Mark name={c.name} className="h-8 w-8 rounded-full" />
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-[11px] text-ink-3">{c.startup} · {formatAppDate(c.lastTouch, locale)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="erp-card p-4 text-[13px]">
            <h3 className="mb-2 font-semibold">{t("erp.relQuick")}</h3>
            <ul className="space-y-1 text-[#2563EB]">
              <li><button type="button" onClick={() => { setKind("all"); setQ(""); }}>{t("erp.relMine")}</button></li>
              <li><button type="button" onClick={() => setKind("Fondateur")}>{t("erp.relFounderContacts")}</button></li>
              <li><button type="button" onClick={() => setKind("Investisseur")}>{t("erp.relInvestors")}</button></li>
              <li><button type="button" onClick={() => setKind("Partenaire")}>{t("erp.relPartners")}</button></li>
              <li><span className="text-ink-3">{t("erp.relIntroHint")}</span></li>
            </ul>
          </div>
        </aside>
      </div>
      {note ? (
        <ErpOverlay onClose={() => setNote(false)} panelClassName="max-w-md">
            <h2 className="text-[16px] font-semibold">{t("erp.relNew")}</h2>
            <p className="mt-2 text-[13px] text-ink-2">{t("erp.relNoTable")}</p>
            <Button className="mt-4" onClick={() => setNote(false)}>{t("erp.relGotIt")}</Button>
        </ErpOverlay>
      ) : null}
    </div>
  );
}
