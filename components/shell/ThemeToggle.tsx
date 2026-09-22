"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

const STORAGE_KEY = "cvd-theme";

export type ThemeMode = "dark" | "light" | "system";

type ViewTransitionDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

function resolveDark(mode: ThemeMode) {
  if (mode === "light") return false;
  if (mode === "dark") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function readThemeMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

export function applyThemeMode(mode: ThemeMode, x?: number, y?: number) {
  const flip = () => {
    document.documentElement.classList.toggle("dark", resolveDark(mode));
    window.localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(new Event("cvd:theme"));
  };

  const doc = document as ViewTransitionDocument;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof doc.startViewTransition !== "function" || reducedMotion) {
    flip();
    return;
  }

  document.documentElement.style.setProperty("--vt-x", `${x ?? window.innerWidth / 2}px`);
  document.documentElement.style.setProperty("--vt-y", `${y ?? window.innerHeight / 2}px`);
  doc.startViewTransition(flip);
}

export function applyTheme(nextDark: boolean, x?: number, y?: number) {
  applyThemeMode(nextDark ? "dark" : "light", x, y);
}

export function applyThemeToggle(x?: number, y?: number) {
  const mode = readThemeMode();
  const order: ThemeMode[] = ["dark", "light", "system"];
  const next = order[(order.indexOf(mode) + 1) % order.length];
  applyThemeMode(next, x, y);
}

export function ThemeToggle({ className }: { label?: string; className?: string }) {
  const { t } = useLocale();
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const sync = () => setMode(readThemeMode());
    sync();
    window.addEventListener("cvd:theme", sync);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      if (readThemeMode() === "system") applyThemeMode("system");
    };
    mq.addEventListener("change", onScheme);
    return () => {
      window.removeEventListener("cvd:theme", sync);
      mq.removeEventListener("change", onScheme);
    };
  }, []);

  const set = (next: ThemeMode, e: React.MouseEvent) => {
    applyThemeMode(next, e.clientX, e.clientY);
    setMode(next);
  };

  return (
    <div className={cn("inline-flex rounded-md border border-line bg-surface p-0.5 font-mono text-[10px] uppercase tracking-[0.08em]", className)}>
      {(["dark", "light", "system"] as const).map((id) => (
        <button
          key={id}
          type="button"
          onClick={(e) => set(id, e)}
          className={cn("rounded px-1.5 py-0.5", mode === id ? "bg-surface-2 font-semibold text-ink" : "text-ink-3")}
        >
          {id === "dark" ? t("topbar.dark") : id === "light" ? t("topbar.light") : t("topbar.system")}
        </button>
      ))}
    </div>
  );
}

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${STORAGE_KEY}");
    var dark;
    if (stored === "light") dark = false;
    else if (stored === "dark") dark = true;
    else if (stored === "system") dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    else dark = false;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {
    document.documentElement.classList.remove("dark");
  }
})();
`;
