import { describe, expect, it } from "vitest";
import { aiRecommendation, awaitingReview, crmStatus, duplicateKey } from "@/lib/crm";
import { deal } from "./fixtures";

describe("crm status vs AI recommendation", () => {
  it("maps gp Advance to Selected without inventing a score", () => {
    const d = deal({
      name: "10MG Health",
      status: "En étude",
      score: {
        sourceRecordId: "rec1",
        dealId: "d1",
        screeningStage: "Review",
        gpDecision: "Advance",
        qualified: true,
        rejectionReason: null,
        cvdScore: 81,
        recommendation: "Advance",
        assessment: null,
        axes: [],
        strengths: [],
        risks: [],
        deckSummary: [],
        scoredAt: null,
        updatedAt: "2026-09-01",
      },
    });
    expect(crmStatus(d)).toBe("Selected");
    expect(aiRecommendation(d)).toBe("Strong Fit");
    expect(awaitingReview(d)).toBe(false);
  });

  it("treats missing AI score as Needs Information, not a zero", () => {
    const d = deal({ name: "Thin File", status: "À contacter" });
    expect(aiRecommendation(d)).toBe("Needs Information");
    expect(crmStatus(d)).toBe("New");
    expect(awaitingReview(d)).toBe(true);
  });

  it("builds a stable duplicate key from domain or name", () => {
    expect(duplicateKey("Acme Inc", "https://www.acme.com/about")).toBe("acme.com");
    expect(duplicateKey("Acme Inc")).toBe("acme inc");
  });
});
