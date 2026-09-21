const COOKIE = "cvd-session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function sessionCookieName() {
  return COOKIE;
}

export function sessionMaxAge() {
  return MAX_AGE_SEC;
}

export function demoEmail() {
  return (process.env.DEMO_EMAIL || "investors123@gmail.com").trim().toLowerCase();
}

/** Comma-separated CRM logins plus the three seeded teammates and DEMO_EMAIL. */
export function allowedEmails(): string[] {
  const fromList = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const extras = [
    demoEmail(),
    "lmeriem28@gmail.com",
    "dlaraki@u-investors.com",
    "j.lobe@u-investors.com",
    process.env.TEAM_DRISS_EMAIL,
    process.env.TEAM_JONATHAN_EMAIL,
  ]
    .map((s) => (s || "").trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...fromList, ...extras])];
}

export function emailAllowed(email: string) {
  return allowedEmails().includes(email.trim().toLowerCase());
}

export function demoPassword() {
  return process.env.DEMO_PASSWORD || "1234@5";
}

export function authSecret() {
  return process.env.AUTH_SECRET || process.env.CRON_SECRET || "u-investors-cvd-demo";
}

export function authIsRequired() {
  return process.env.AUTH_REQUIRED !== "false";
}

function toB64Url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64Url(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(authSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toB64Url(new Uint8Array(sig));
}

function timingEqual(a: string, b: string) {
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

export async function createSessionToken(email: string) {
  const payload = toB64Url(new TextEncoder().encode(JSON.stringify({ e: email.toLowerCase(), exp: Date.now() + MAX_AGE_SEC * 1000 })));
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function readSessionToken(token: string | undefined | null): Promise<{ email: string } | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload);
  if (!timingEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64Url(payload))) as { e?: string; exp?: number };
    if (!data.e || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { email: data.e };
  } catch {
    return null;
  }
}

export function credentialsMatch(email: string, password: string) {
  const okEmail = emailAllowed(email);
  const okPass = timingEqual(password, demoPassword());
  return okEmail && okPass;
}
