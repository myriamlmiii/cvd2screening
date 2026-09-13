"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translate, type Locale } from "@/lib/dictionary";

const STORAGE_KEY = "cvd-locale";

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
  t: (key: string) => string;
} | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "fr") setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const toggle = useCallback(() => {
    setLocale(locale === "en" ? "fr" : "en");
  }, [locale, setLocale]);

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  const value = useMemo(() => ({ locale, setLocale, toggle, t }), [locale, setLocale, toggle, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
