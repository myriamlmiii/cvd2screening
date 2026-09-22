"use client";

import { useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import { LoginMark3D } from "@/components/auth/LoginMark3D";

function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
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
      setError("Email or password not recognised.");
      return;
    }
    toast.success("Signed in");
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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="mb-5 flex flex-col items-center">
          <LoginMark3D />
          <div className="mt-3 text-[18px] font-bold tracking-tight text-[#1B2B44]">U-investors</div>
          <div className="text-[12px] text-ink-3">CVD 2.0</div>
        </div>
        <form onSubmit={submit} className="erp-card p-6">
          <h1 className="text-[18px] font-bold text-[#1B2B44]">Sign in</h1>
          <label className="mt-4 block text-[12px] font-medium text-ink-2">
            Email
            <input
              type="email"
              autoComplete="username"
              autoFocus
              required
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </label>
          <label className="mt-3 block text-[12px] font-medium text-ink-2">
            Password
            <span className="relative mt-1 block">
              <input
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 pr-10 text-[13px] outline-none focus:ring-2 focus:ring-[#2563EB]/30"
              />
              <button
                type="button"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-3 hover:bg-surface-2"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
            {caps ? <span className="mt-1 block text-[11px] text-[#D97706]">Caps Lock is on.</span> : null}
          </label>
          {error ? (
            <p id={errorId} role="alert" className="mt-3 text-[12px] text-[#DC2626]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className={cn(
              "mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] text-[14px] font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-60",
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Signing in…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
