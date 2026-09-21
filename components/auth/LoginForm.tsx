"use client";

import { useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { toast } from "@/components/ui/Toaster";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { t, locale, setLocale } = useLocale();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("login.bad"));
      toast.error(t("login.bad"));
      return;
    }
    toast.success(t("login.ok"));
    router.replace(search.get("next") || "/");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#1B2B44]" />
            <div className="text-[18px] font-bold text-[#1B2B44]">U-investors</div>
          </div>
          <div className="flex rounded-lg border border-line bg-white text-[11px] font-semibold">
            <button type="button" onClick={() => setLocale("fr")} className={cn("px-2 py-1", locale === "fr" ? "bg-[#2563EB] text-white" : "text-ink-3")}>
              FR
            </button>
            <button type="button" onClick={() => setLocale("en")} className={cn("px-2 py-1", locale === "en" ? "bg-[#2563EB] text-white" : "text-ink-3")}>
              EN
            </button>
          </div>
        </div>
        <form onSubmit={submit} className="erp-card p-6">
          <h1 className="text-[18px] font-bold">{t("login.title")}</h1>
          <p className="mt-1 text-[12px] text-ink-3">{t("login.subtitle")}</p>
          <label className="mt-4 block text-[12px] font-medium text-ink-2">
            {t("login.email")}
            <input type="email" autoComplete="username" autoFocus required disabled={busy} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-[#2563EB]/30" />
          </label>
          <label className="mt-3 block text-[12px] font-medium text-ink-2">
            {t("login.password")}
            <input type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-[#2563EB]/30" />
          </label>
          {error ? <p id={errorId} role="alert" className="mt-3 text-[12px] text-[#DC2626]">{error}</p> : null}
          <button type="submit" disabled={busy} className="mt-5 h-11 w-full rounded-lg bg-[#2563EB] text-[14px] font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-60">
            {busy ? t("login.entering") : t("login.enter")}
          </button>
        </form>
      </div>
    </div>
  );
}
