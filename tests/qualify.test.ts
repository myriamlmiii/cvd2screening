import { describe, expect, it } from "vitest";
import { qualify } from "@/lib/qualify";
import { deal } from "./fixtures";

describe("qualify", () => {
  it("keeps unclear deals visible and flags missing AI language", () => {
    const q = qualify(deal({ name: "Acme Logistics", sector: "Logistics", description: "freight software" }));
    expect(q.passed).toBe(true);
    expect(q.checks.find((c) => c.name === "ai_layer")?.passed).toBe(false);
  });

  it("matches core Fintech + AI language", () => {
    const q = qualify(deal({ name: "PayAI", sector: "Fintech", description: "agentic llm underwriting" }));
    expect(q.checks.find((c) => c.name === "sector")?.passed).toBe(true);
    expect(q.matchedAiTerms.length).toBeGreaterThan(0);
  });
});
