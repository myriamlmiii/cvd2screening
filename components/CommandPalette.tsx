"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  LayoutGrid,
  GitBranch,
  Briefcase,
  KanbanSquare,
  Moon,
  Languages,
  Search,
  Building2,
  FolderOpen,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { applyThemeToggle } from "@/components/shell/ThemeToggle";
import { cn } from "@/lib/utils";
import type { SlimDeal } from "@/lib/startups/slim";

type Item = {
  id: string;
  label: string;
  hint?: string;
  group: "startups" | "nav" | "actions";
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t, toggle: toggleLocale } = useLocale();
  const needle = query.trim();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("cvd:open-palette", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("cvd:open-palette", onOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const hits = useQuery({
    queryKey: ["palette-search", needle],
    queryFn: async () => {
      const res = await fetch(`/api/startups?q=${encodeURIComponent(needle)}&pageSize=8`);
      if (!res.ok) return [] as SlimDeal[];
      const json = (await res.json()) as { rows?: SlimDeal[] };
      return json.rows ?? [];
    },
    enabled: open && needle.length >= 2,
    staleTime: 15_000,
  });

  const toggleTheme = () => applyThemeToggle(window.innerWidth / 2, window.innerHeight / 2);

  const items = useMemo<Item[]>(() => {
    const nav: Item[] = [
      { id: "overview", label: t("erp.navSituation"), group: "nav", icon: LayoutGrid, run: () => router.push("/") },
      { id: "pipeline", label: t("erp.navPipeline"), group: "nav", icon: GitBranch, run: () => router.push("/pipeline") },
      { id: "portfolio", label: t("erp.navPortfolio"), group: "nav", icon: Briefcase, run: () => router.push("/portfolio") },
      { id: "tasks", label: t("erp.navTasks"), group: "nav", icon: KanbanSquare, run: () => router.push("/tasks") },
      { id: "files", label: t("erp.navDocuments"), group: "nav", icon: FolderOpen, run: () => router.push("/documents") },
      { id: "agenda", label: t("erp.navAgenda"), group: "nav", icon: KanbanSquare, run: () => router.push("/agenda") },
      { id: "relations", label: t("erp.navRelations"), group: "nav", icon: Building2, run: () => router.push("/relations") },
      { id: "ai", label: t("erp.navAi"), group: "nav", icon: LayoutGrid, run: () => router.push("/ai") },
      { id: "settings", label: t("erp.navSettings"), group: "nav", icon: Briefcase, run: () => router.push("/settings") },
      { id: "theme", label: t("palette.toggleTheme"), group: "actions", icon: Moon, run: toggleTheme },
      { id: "locale", label: t("palette.toggleLocale"), group: "actions", icon: Languages, run: toggleLocale },
    ];
    const q = needle.toLowerCase();
    const commands = q ? nav.filter((i) => i.label.toLowerCase().includes(q)) : nav;
    const startups: Item[] = (hits.data ?? []).map((row) => ({
      id: `startup-${row.id}`,
      label: row.name,
      hint: [row.sector, row.country, row.score?.aiRecommendation].filter(Boolean).join(" · "),
      group: "startups",
      icon: Building2,
      run: () => router.push(`/pipeline/${encodeURIComponent(row.id)}`),
    }));
    return [...startups, ...commands];
  }, [t, router, toggleLocale, needle, hits.data]);

  const runActive = (item: Item) => {
    item.run();
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      runActive(items[active]);
    }
  };

  const groups = [
    { key: "startups" as const, label: t("palette.groupStartups") },
    { key: "nav" as const, label: t("palette.groupNav") },
    { key: "actions" as const, label: t("palette.groupActions") },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200]" style={{ background: "rgba(0, 0, 0, 0.5)" }} />
        <Dialog.Content
          className="palette-holo fixed left-1/2 top-[18%] z-[201] w-[92vw] max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-line bg-surface shadow-overlay"
          onKeyDown={onKeyDown}
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-line px-3.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-3" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder={t("palette.placeholder")}
              className="h-11 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto p-1.5">
            {items.length === 0 && (
              <div className="px-3 py-6 text-center text-[12px] text-ink-3">{t("palette.empty")}</div>
            )}
            {groups.map((g) => {
              const groupItems = items.filter((i) => i.group === g.key);
              if (groupItems.length === 0) return null;
              return (
                <div key={g.key} className="mb-1 last:mb-0">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {g.label}
                  </div>
                  {groupItems.map((item) => {
                    const idx = items.indexOf(item);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => runActive(item)}
                        className={cn(
                          "relative flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-[13px] transition-shadow duration-fast",
                          idx === active ? "select-glow bg-surface-2 text-ink" : "text-ink-2",
                        )}
                      >
                        <Icon className="h-[15px] w-[15px] text-ink-3" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.hint ? <span className="max-w-[40%] truncate text-[10px] text-ink-3">{item.hint}</span> : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="border-t border-line px-3.5 py-2 text-[11px] text-ink-3">{t("palette.hint")}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
