import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://platform.higgsfield.ai";
const id = process.env.HF_API_KEY_ID || process.env.HIGGSFIELD_KEY_ID;
const secret = process.env.HF_API_KEY_SECRET || process.env.HIGGSFIELD_KEY_SECRET;

async function poll(statusUrl, auth) {
  const started = Date.now();
  let delay = 1500;
  while (Date.now() - started < 120000) {
    const res = await fetch(statusUrl, { headers: { Authorization: auth } });
    const json = await res.json();
    if (["completed", "failed", "canceled"].includes(json.status)) return json;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 6000);
  }
  throw new Error("Higgsfield generation timed out.");
}

async function generate(prompt, aspect) {
  const auth = `Key ${id}:${secret}`;
  const submit = await fetch(`${BASE}/higgsfield-ai/soul/standard`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, aspect_ratio: aspect, resolution: "2K" }),
  });
  if (!submit.ok) throw new Error(`Higgsfield submit failed (${submit.status})`);
  const job = await submit.json();
  const statusUrl = job.status_url || `${BASE}/requests/${job.request_id}/status`;
  const done = await poll(statusUrl, auth);
  const url = done.images?.[0]?.url || done.image?.url;
  if (!url) throw new Error("No image URL");
  return url;
}

async function save(url, file) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "brand");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, file), buf);
}

async function main() {
  if (!id || !secret) {
    console.log("HF_API_KEY_ID / HF_API_KEY_SECRET not set. Existing public/brand stills are kept.");
    return;
  }
  const mark = await generate(
    "Premium 3D venture-capital app icon, extruded metallic letter U, navy #0c2340 with teal #1f6f66 bevel, rounded square tile, studio lighting, dark navy background, photoreal, no extra text",
    "1:1",
  );
  await save(mark, "mark-3d.png");
  const lockup = await generate(
    "Photoreal 3D brand lockup, navy metallic U mark beside the word U-investors in clean white sans type, teal accent, dark studio backdrop, no slogan",
    "16:9",
  );
  await save(lockup, "lockup-3d.png");
  console.log("Wrote public/brand via Higgsfield.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
