const BASE = "https://platform.higgsfield.ai";

export type HiggsfieldJob = {
  status: string;
  request_id?: string;
  status_url?: string;
  images?: { url?: string }[];
  image?: { url?: string };
};

function credentials() {
  const id = process.env.HF_API_KEY_ID || process.env.HIGGSFIELD_KEY_ID;
  const secret = process.env.HF_API_KEY_SECRET || process.env.HIGGSFIELD_KEY_SECRET;
  if (!id || !secret) return null;
  return { id, secret };
}

export function higgsfieldConfigured() {
  return Boolean(credentials());
}

async function poll(statusUrl: string, auth: string, timeoutMs = 120_000): Promise<HiggsfieldJob> {
  const started = Date.now();
  let delay = 1500;
  while (Date.now() - started < timeoutMs) {
    const res = await fetch(statusUrl, { headers: { Authorization: auth } });
    const json = (await res.json()) as HiggsfieldJob;
    if (json.status === "completed" || json.status === "failed" || json.status === "canceled") return json;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 6000);
  }
  throw new Error("Higgsfield generation timed out.");
}

export async function generateBrandStill(prompt: string, aspectRatio = "1:1"): Promise<string> {
  const creds = credentials();
  if (!creds) throw new Error("Set HF_API_KEY_ID and HF_API_KEY_SECRET to generate brand stills via Higgsfield.");
  const auth = `Key ${creds.id}:${creds.secret}`;
  const submit = await fetch(`${BASE}/higgsfield-ai/soul/standard`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, aspect_ratio: aspectRatio, resolution: "2K" }),
  });
  if (!submit.ok) {
    throw new Error(`Higgsfield submit failed (${submit.status}).`);
  }
  const job = (await submit.json()) as HiggsfieldJob;
  const statusUrl = job.status_url || (job.request_id ? `${BASE}/requests/${job.request_id}/status` : null);
  if (!statusUrl) throw new Error("Higgsfield did not return a status URL.");
  const done = await poll(statusUrl, auth);
  if (done.status !== "completed") throw new Error(`Higgsfield job ${done.status}`);
  const url = done.images?.[0]?.url || done.image?.url;
  if (!url) throw new Error("Higgsfield completed without an image URL.");
  return url;
}
