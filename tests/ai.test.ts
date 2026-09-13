import { describe, expect, it } from "vitest";
import { parseAiMemo, parseAiScore } from "@/lib/ai/schema";
import { screeningHash } from "@/lib/ai/hash";

describe("AI validation", () => {
  it("accepts a structured memo", () => {
    const memo = parseAiMemo(
      JSON.stringify({
        recommendation: "Needs Information",
        conviction: "Low",
        thesis: "Thin file",
        justification: ["no traction disclosed"],
        gaps: ["financials"],
        nextAction: "Request deck",
      }),
    );
    expect(memo?.recommendation).toBe("Needs Information");
  });

  it("rejects invalid scores so they are not persisted", () => {
    const result = parseAiScore(JSON.stringify({ overall: 140, recommendation: "Invest" }));
    expect(result.ok).toBe(false);
  });

  it("hashes normalized content for dedupe", () => {
    const a = screeningHash({ name: "Acme", description: "  Hello   world " });
    const b = screeningHash({ name: "Acme", description: "hello world" });
    expect(a).toBe(b);
  });
});
