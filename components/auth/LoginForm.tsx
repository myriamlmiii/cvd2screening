"use client";

import { useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/Toaster";
import { LoginMark3D } from "@/components/auth/LoginMark3D";
import { DayNightToggle } from "@/components/shell/ThemeToggle";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { locale, setLocale, t } = useLocale();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [caps, setCaps] = useState(false);
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
    if (!res.ok) {
      setBusy(false);
      setError(t("login.bad"));
      return;
    }
    toast.success(t("login.ok"));
    router.replace(safeNext(search.get("next")));
    router.refresh();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => setCaps(e.getModifierState("CapsLock"));
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-canvas px-5">
      <div className="flex justify-end gap-2 pt-5">
        <DayNightToggle />
        <div className="flex rounded-lg border border-line text-[11px] font-semibold">
          <button type="button" onClick={() => setLocale("fr")} className={cn("px-2 py-1", locale === "fr" ? "bg-cvd text-white" : "text-ink-3")}>
            FR
          </button>
          <button type="button" onClick={() => setLocale("en")} className={cn("px-2 py-1", locale === "en" ? "bg-cvd text-white" : "text-ink-3")}>
            EN
          </button>
        </div>
      </div>
      <form onSubmit={submit} className="m-auto w-full max-w-[360px] animate-fade-in pb-16">
        <div className="mb-8 flex flex-col items-center">
          <LoginMark3D />
          <div className="mt-3 text-[18px] font-bold tracking-tight text-ink">U-investors</div>
          <p className="mt-1 text-[12px] text-ink-3">{t("login.subtitle")}</p>
        </div>
        <label className="block text-[12px] font-medium text-ink-2">
          {t("login.email")}
          <input
            type="email"
            autoComplete="username"
            autoFocus
            required
            disabled={busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-line bg-transparent px-3 text-[13px] outline-none focus:ring-2 focus:ring-cvd/30"
          />
        </label>
        <label className="mt-3 block text-[12px] font-medium text-ink-2">
          {t("login.password")}
          <span className="relative mt-1 block">
            <input
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
              className="h-11 w-full rounded-lg border border-line bg-transparent px-3 pr-10 text-[13px] outline-none focus:ring-2 focus:ring-cvd/30"
            />
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-3 hover:bg-surface-2"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? t("login.hidePass") : t("login.showPass")}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
          {caps ? <span className="mt-1 block text-[11px] text-warning">{t("login.caps")}</span> : null}
        </label>
        {error ? (
          <p id={errorId} role="alert" className="mt-3 text-[12px] text-critical">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cvd text-[14px] font-medium text-white hover:bg-cvd/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? t("login.entering") : t("login.enter")}
        </button>
      </form>
    </div>
  );
}
