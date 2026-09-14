"use client";

import { useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UInvestorsLogo, SceneBackground } from "@/components/brand/UInvestorsLogo";

const fieldClass =
  "mt-2 h-11 w-full rounded-md border border-white/10 bg-[#272e26] px-3 text-[13px] text-[#ecece8] outline-none transition-colors focus:border-[#c4a57a] focus:shadow-[0_0_0_3px_rgba(196,165,122,0.18)] disabled:opacity-50";
const labelClass = "block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa094]";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
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
      setError("Those credentials were not accepted.");
      return;
    }
    router.replace(search.get("next") || "/");
    router.refresh();
  };

  return (
    <div className="login-screen dark animate-fade-in relative isolate flex min-h-screen items-center justify-center px-5 text-[#ecece8]">
      <SceneBackground />
      <div className="relative z-10 flex w-full max-w-[380px] flex-col items-center">
        <UInvestorsLogo size="hero" />

        <div className="mt-8 w-full rounded-xl border border-white/10 bg-[#1a1f19] shadow-[0_32px_90px_-16px_rgba(0,0,0,0.6)]">
          <form onSubmit={submit} aria-busy={busy} className="p-7">
            <label className={labelClass}>
              Email
              <input
                type="email"
                autoComplete="username"
                autoFocus
                required
                disabled={busy}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </label>

            <label className={`mt-4 ${labelClass}`}>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
              />
            </label>

            {error ? (
              <p id={errorId} role="alert" className="mt-3 text-[12px] text-[#e08a7a]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              aria-describedby={error ? errorId : undefined}
              className="mt-6 h-11 w-full rounded-md bg-[#c4a57a] text-[13px] font-semibold tracking-wide text-[#1a1c18] transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
