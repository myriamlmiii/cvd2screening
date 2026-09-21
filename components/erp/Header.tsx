"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Calendar, ChevronDown, FileText, Search, TriangleAlert } from "lucide-react";
import { formatHeaderDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import type { SituationPayload } from "@/lib/erp/payloads";

const MOBILE = [
  { href: "/", key: "erp.navSituation" },
  { href: "/pipeline", key: "erp.navPipeline" },
  { href: "/portfolio", key: "erp.navPortfolio" },
  { href: "/tasks", key: "erp.navTasks" },
];

const KIND_ICON = {
  term_sheet: { Icon: FileText, className: "bg-blue-100 text-blue-600" },
  docs: { Icon: FileText, className: "bg-blue-100 text-blue-600" },
  meeting: { Icon: Calendar, className: "bg-violet-100 text-violet-600" },
  overdue: { Icon: TriangleAlert, className: "bg-red-100 text-red-600" },
};

export function ErpHeader({
  notifications = [],
}: {
  notifications?: SituationPayload["notifications"];
}) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const unread = notifications.length;

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("cvd:open-palette"))}
          className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-[#F5F7FA] px-3 text-[13px] text-ink-3 md:max-w-xl"
        >
          <Search className="h-4 w-4" />
          <span className="truncate">{t("erp.search")}</span>
          <kbd className="ml-auto hidden text-[11px] text-ink-3 sm:inline">⌘ K</kbd>
        </button>
        <div className="hidden whitespace-nowrap text-[13px] text-ink-2 lg:block">{formatHeaderDate(new Date(), locale)}</div>
        <div className="flex rounded-lg border border-line text-[11px] font-semibold">
          <button type="button" onClick={() => setLocale("fr")} className={cn("px-2 py-1", locale === "fr" ? "bg-[#2563EB] text-white" : "text-ink-3")}>
            FR
          </button>
          <button type="button" onClick={() => setLocale("en")} className={cn("px-2 py-1", locale === "en" ? "bg-[#2563EB] text-white" : "text-ink-3")}>
            EN
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              setMenu(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2"
            aria-label={t("erp.notifications")}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC2626] px-1 text-[9px] font-bold text-white">
                {unread}
              </span>
            ) : null}
          </button>
          {open ? (
            <div className="absolute right-0 top-11 z-30 w-[340px] rounded-2xl border border-line bg-white p-3 shadow-overlay">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[14px] font-semibold">{t("erp.notifications")}</span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">{t("erp.newCount", { n: unread })}</span>
              </div>
              <ul className="space-y-1">
                {notifications.length === 0 ? (
                  <li className="px-1 py-4 text-[12px] text-ink-3">{t("erp.noNotifications")}</li>
                ) : (
                  notifications.map((n) => {
                    const meta = KIND_ICON[n.kind] ?? KIND_ICON.docs;
                    const Icon = meta.Icon;
                    return (
                      <li key={n.id} className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-[#F5F7FA]">
                        <span className={cn("mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg", meta.className)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium text-ink">{n.title}</span>
                          <span className="block text-[12px] text-ink-3">{n.subtitle}</span>
                        </span>
                        <span className="text-[11px] text-ink-3">{n.when}</span>
                      </li>
                    );
                  })
                )}
              </ul>
              <Link href="/tasks" className="mt-2 block text-center text-[12px] font-medium text-[#2563EB]" onClick={() => setOpen(false)}>
                {t("erp.seeAllNotifications")}
              </Link>
            </div>
          ) : null}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setMenu((v) => !v);
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-full pl-1 pr-1 text-left hover:bg-surface-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-[12px] font-bold text-white">D</span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[13px] font-semibold text-ink">Driss</span>
              <span className="block text-[11px] text-ink-3">Managing Director</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-ink-3 sm:block" />
          </button>
          {menu ? (
            <div className="absolute right-0 top-11 z-30 w-44 rounded-xl border border-line bg-white p-1 shadow-overlay">
              <button type="button" onClick={signOut} className="w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-surface-2">
                {t("erp.signOut")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <nav className="flex gap-1 border-t border-line px-2 py-1.5 md:hidden">
        {MOBILE.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("rounded-lg px-3 py-1.5 text-[13px]", active ? "bg-cvd-soft font-medium text-[#2563EB]" : "text-ink-3")}
            >
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
