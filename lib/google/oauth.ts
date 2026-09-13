import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { logOp } from "@/lib/log";

function persistEnvLocal(key: string, value: string) {
  const path = join(process.cwd(), ".env.local");
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    text = "";
  }
  const line = `${key}=${value}`;
  const re = new RegExp(`^#?\\s*${key}=.*$`, "m");
  const next = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  writeFileSync(path, next, "utf8");
}

export async function exchangeGoogleAuthCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000";
  if (!clientId || !clientSecret) return { ok: false, error: "Google OAuth client is not configured." };

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const json = (await res.json()) as { refresh_token?: string; access_token?: string; error?: string; error_description?: string };
  if (!res.ok) {
    logOp({ op: "google.oauth", status: "error", error: json.error_description || json.error || String(res.status) });
    return { ok: false, error: json.error_description || json.error || "Token exchange failed." };
  }
  if (json.refresh_token) {
    persistEnvLocal("GOOGLE_REFRESH_TOKEN", json.refresh_token);
    process.env.GOOGLE_REFRESH_TOKEN = json.refresh_token;
  }
  if (json.access_token) process.env.GOOGLE_ACCESS_TOKEN = json.access_token;
  logOp({ op: "google.oauth", status: json.refresh_token ? "refresh_saved" : "access_only" });
  return { ok: Boolean(json.refresh_token || json.access_token) };
}
