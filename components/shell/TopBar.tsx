"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

const MOBILE_NAV = [
  { key: "nav.overview", href: "/" },
  { key: "nav.pipeline", href: "/review" },
  { key: "nav.portfolio", href: "/analytics" },
  { key: "nav.logs", href: "/workflow" },
  { key: "nav.files", href: "/files" },
];

export function TopBar() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLocale();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="relative flex h-9 items-center px-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("cvd:open-palette"))}
          className="absolute left-1/2 hidden h-7 w-[200px] -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[11px] text-ink-3 hover:text-ink-2 sm:flex"
        >
          <Search className="h-3.5 w-3.5" />
          {t("topbar.commandHint")}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("cvd:open-palette"))}
            className="hidden font-mono text-[11px] text-ink-3 sm:inline"
          >
            Cmd+K
          </button>
          <ThemeToggle />
          <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em]">
            <button type="button" onClick={() => setLocale("fr")} className={cn(locale === "fr" ? "text-ink" : "text-ink-3")}>
              French
            </button>
            <span className="text-ink-3">/</span>
            <button type="button" onClick={() => setLocale("en")} className={cn(locale === "en" ? "text-ink" : "text-ink-3")}>
              English
            </button>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 border-t border-line px-2 py-1.5 md:hidden">
        {MOBILE_NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("rounded px-3 py-1.5 text-[13px]", active ? "bg-surface-2 font-medium text-ink" : "text-ink-3")}
            >
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
