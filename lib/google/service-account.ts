import { createSign } from "crypto";
import { withBackoff } from "@/lib/retry";
import { logOp } from "@/lib/log";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

type ServiceAccountKey = { client_email: string; private_key: string };

let cached: { token: string; expiresAt: number } | null = null;

/**
 * GOOGLE_SERVICE_ACCOUNT_KEY holds the full JSON key file Google Cloud Console
 * generates for a service account (client_email + private_key), pasted as a
 * single-line env var. The Drive folder is shared with client_email directly
 * — no OAuth consent screen, no refresh token, no per-owner login, ever.
 */
function loadKey(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccountKey>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function signAssertion(key: ServiceAccountKey, scope: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: key.client_email,
    scope,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(key.private_key));
  return `${unsigned}.${signature}`;
}

export function isServiceAccountConfigured(): boolean {
  return loadKey() !== null;
}

export function serviceAccountEmail(): string | null {
  return loadKey()?.client_email ?? null;
}

/** Self-signed JWT bearer flow (RFC 7523) — trades the service account's private key for a short-lived access token. Cached in-memory until ~1 minute before expiry. */
export async function serviceAccountAccessToken(scope: string = DRIVE_READONLY_SCOPE): Promise<string | null> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const key = loadKey();
  if (!key) return null;

  const assertion = signAssertion(key, scope);
  const res = await withBackoff(() =>
    fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    }),
  );
  if (!res.ok) {
    logOp({ op: "google.service-account", status: "error", error: `token ${res.status}: ${await res.text()}` });
    return null;
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return json.access_token;
}
