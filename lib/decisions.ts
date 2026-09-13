"use client";

export type PrevDecision = { id: string; gpDecision: string };

export async function postDecisions(
  items: { id: string; gpDecision: string; rationale?: string; tags?: string[]; aiRecommendation?: string | null }[],
): Promise<{ previous: PrevDecision[] | null; error: string | null }> {
  try {
    const res = await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const body = (await res.json().catch(() => null)) as { previous?: PrevDecision[]; error?: string } | null;
    if (!res.ok) return { previous: null, error: body?.error || `Decision failed (${res.status}).` };
    return { previous: body?.previous ?? [], error: null };
  } catch {
    return { previous: null, error: "Network error while recording the decision." };
  }
}
