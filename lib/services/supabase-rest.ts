function restUrl(path: string) {
  const base = process.env.SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/rest/v1/${path}`;
}

function headers(key: string, extra?: Record<string, string>) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}

export async function supabaseAdmin<T>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null; count: number | null }> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = restUrl(path);
  if (!key || !url) return { ok: false, status: 503, data: null, error: "Supabase is not configured for writes.", count: null };
  const res = await fetch(url, {
    ...init,
    headers: headers(key, init.prefer ? { Prefer: init.prefer } : undefined),
    cache: "no-store",
  });
  const text = await res.text();
  const range = res.headers.get("content-range");
  const count = range && range.includes("/") ? Number(range.split("/")[1]) : null;
  if (!res.ok) return { ok: false, status: res.status, data: null, error: text.slice(0, 500), count };
  return { ok: true, status: res.status, data: text ? (JSON.parse(text) as T) : null, error: null, count };
}

export async function supabaseAnon<T>(path: string): Promise<{ ok: boolean; data: T | null; status: number }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, data: null, status: 503 };
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    headers: headers(key),
    next: { revalidate: 60 },
  });
  if (!res.ok) return { ok: false, data: null, status: res.status };
  return { ok: true, data: (await res.json()) as T, status: res.status };
}

