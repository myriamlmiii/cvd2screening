"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Filter,
  Briefcase,
  ListChecks,
  FileText,
  CalendarDays,
  Users,
  BarChart3,
  Sparkles,
  Settings,
} from "lucide-react";
import { UMark } from "@/components/brand/UMark";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", key: "erp.navSituation", icon: Home },
  { href: "/pipeline", key: "erp.navPipeline", icon: Filter },
  { href: "/portfolio", key: "erp.navPortfolio", icon: Briefcase },
  { href: "/tasks", key: "erp.navTasks", icon: ListChecks, badgeKey: "tasks" as const },
  { href: "/documents", key: "erp.navDocuments", icon: FileText },
  { href: "/agenda", key: "erp.navAgenda", icon: CalendarDays },
  { href: "/relations", key: "erp.navRelations", icon: Users },
  { href: "/analyses", key: "erp.navAnalyses", icon: BarChart3 },
  { href: "/ai", key: "erp.navAi", icon: Sparkles },
  { href: "/settings", key: "erp.navSettings", icon: Settings },
];

export function ErpSidebar({ taskCount = 0 }: { taskCount?: number }) {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[230px] flex-col bg-sidebar text-white md:flex">
      <div className="flex items-center gap-2 px-5 pb-5 pt-6">
        <UMark size={28} className="shrink-0" />
        <div className="text-[16px] font-bold tracking-tight">U-investors</div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const on = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
                on ? "bg-cvd font-medium text-white" : "text-white/55 hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon className="h-[16px] w-[16px] shrink-0" />
              <span className="flex-1">{t(item.key)}</span>
              {item.badgeKey === "tasks" && taskCount > 0 ? (
                <span className="rounded-full bg-[#DC2626] px-1.5 py-px text-[10px] font-semibold text-white">{taskCount}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[10px] leading-4 text-white/35">
        {t("erp.platform")}
        <div>v1.0.0</div>
      </div>
    </aside>
  );
}
