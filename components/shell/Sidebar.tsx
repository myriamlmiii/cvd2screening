"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UInvestorsLogo } from "@/components/brand/UInvestorsLogo";
import { LayoutGrid, Building2, Briefcase, ScrollText, FolderOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

const NAV = [
  { key: "nav.overview", href: "/", icon: LayoutGrid },
  { key: "nav.pipeline", href: "/review", icon: Building2 },
  { key: "nav.portfolio", href: "/analytics", icon: Briefcase },
  { key: "nav.logs", href: "/workflow", icon: ScrollText },
  { key: "nav.files", href: "/files", icon: FolderOpen },
  { key: "nav.settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <aside className="sidebar-shell fixed inset-y-0 left-0 z-30 hidden w-[168px] flex-col bg-[var(--sidebar,#1a1e24)] text-ink-2 md:flex">
      <div className="flex items-center gap-2 px-2.5 pb-3 pt-3">
        <UInvestorsLogo size="nav" />
        <div className="text-[11px] font-semibold tracking-tight text-ink">U-Investors</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-1.5 pb-3">
        <ul className="space-y-px">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  (item.href === "/review" && (pathname.startsWith("/pipeline") || pathname.startsWith("/review"))) ||
                  (item.href === "/analytics" && pathname.startsWith("/portfolio")) ||
                  (item.href === "/workflow" && pathname.startsWith("/screening"));
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] transition-colors",
                    on
                      ? "bg-black/[0.06] font-medium text-ink dark:bg-white/[0.07]"
                      : "hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.04]",
                  )}
                >
                  <Icon className={cn("h-[13px] w-[13px]", on ? "text-[#c4a57a]" : "text-ink-3")} />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
