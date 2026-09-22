"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import { LoginMark3D } from "@/components/auth/LoginMark3D";

function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  return raw;
}

function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const errorId = useId();
  const card = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [spot, setSpot] = useState({ x: 50, y: 40 });
  const [btnShift, setBtnShift] = useState({ x: 0, y: 0 });

  const emailOk = emailLooksValid(email);
  const canSubmit = emailOk && password.length > 0 && !busy;

  const onSceneMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSpot({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      setBusy(false);
      setError("Those credentials were not recognised.");
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      toast.error("Sign-in failed");
      return;
    }
    toast.success("Welcome in");
    router.replace(safeNext(search.get("next")));
    router.refresh();
  };

  const dots = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53) % 100}%`,
        delay: `${(i % 7) * 0.4}s`,
      })),
    [],
  );

  return (
    <div className="login-shell relative min-h-screen overflow-hidden bg-[#07111f] text-white" onMouseMove={onSceneMove}>
      <div
        className="pointer-events-none absolute inset-0 opacity-80 transition-opacity duration-300"
        style={{
          background: `radial-gradient(520px circle at ${spot.x}% ${spot.y}%, rgba(37,99,235,0.22), transparent 55%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.2),rgba(7,17,31,0.85))]" />
      {dots.map((d) => (
        <span
          key={d.id}
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-white/25"
          style={{ left: d.left, top: d.top, animation: `login-float 5s ${d.delay} ease-in-out infinite` }}
        />
      ))}

      <div className="relative z-[1] mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="hidden flex-col items-center text-center lg:flex lg:items-start lg:text-left">
          <LoginMark3D />
          <h1 className="mt-8 font-display text-[42px] font-semibold tracking-tight">U-investors</h1>
          <p className="mt-2 max-w-sm text-[15px] text-white/65">CVD 2.0 · live pipeline, portfolio and decisions in one fund operating system.</p>
          <ul className="mt-8 space-y-2 text-left text-[13px] text-white/55">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" /> Airtable pipeline, unchanged</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-teal-400" /> Decisions written to your log</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> Team allowlist only</li>
          </ul>
        </section>

        <section className="mx-auto w-full max-w-[420px]">
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <div className="scale-90">
              <LoginMark3D />
            </div>
            <div className="mt-3 text-[20px] font-semibold tracking-tight">U-investors</div>
          </div>
          <form
            ref={card}
            onSubmit={submit}
            className={cn(
              "rounded-3xl border border-white/10 bg-white p-7 text-[#1B2B44] shadow-[0_30px_80px_-32px_rgba(0,0,0,0.55)]",
              shake && "animate-login-shake",
            )}
          >
            <h2 className="text-[22px] font-semibold tracking-tight">Sign in</h2>
            <p className="mt-1 text-[13px] text-ink-3">Use your authorised fund email.</p>

            <label className="mt-6 block text-[12px] font-medium text-ink-2">
              Email
              <span className="relative mt-1.5 block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <input
                  type="email"
                  autoComplete="username"
                  autoFocus
                  required
                  disabled={busy}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@u-investors.com"
                  className={cn(
                    "h-12 w-full rounded-xl border bg-[#F5F7FA] pl-10 pr-3 text-[14px] outline-none transition focus:bg-white focus:ring-2",
                    email.length > 0 && !emailOk ? "border-[#FCA5A5] focus:ring-red-200" : "border-line focus:ring-[#2563EB]/30",
                  )}
                />
              </span>
              {email.length > 3 && !emailOk ? <span className="mt-1 block text-[11px] text-[#DC2626]">Enter a full email address.</span> : null}
            </label>

            <label className="mt-4 block text-[12px] font-medium text-ink-2">
              Password
              <span className="relative mt-1.5 block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={busy}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-line bg-[#F5F7FA] pl-10 pr-11 text-[14px] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#2563EB]/30"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-3 hover:bg-surface-2 hover:text-ink"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
              {caps ? <span className="mt-1 block text-[11px] text-[#D97706]">Caps Lock is on.</span> : null}
            </label>

            {error ? (
              <p id={errorId} role="alert" className="mt-3 rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#B91C1C]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setBtnShift({
                  x: ((e.clientX - r.left) / r.width - 0.5) * 8,
                  y: ((e.clientY - r.top) / r.height - 0.5) * 6,
                });
              }}
              onMouseLeave={() => setBtnShift({ x: 0, y: 0 })}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.8)] transition enabled:hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-45"
              style={{ transform: `translate(${btnShift.x}px, ${btnShift.y}px)` }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Signing in…" : "Enter the fund"}
            </button>
          </form>
          <p className="mt-4 text-center text-[11px] text-white/40">Access is limited to seeded teammates. Nothing is created on a failed attempt.</p>
        </section>
      </div>
    </div>
  );
}
