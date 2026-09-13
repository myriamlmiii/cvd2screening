import { describe, expect, it } from "vitest";
import { suggestedHumanDecision } from "@/lib/screening/suggest";
import { qualificationLabel } from "@/lib/qualification/signal";

describe("human decision is independent of AI", () => {
  it("maps screening labels to a suggestion only", () => {
    expect(suggestedHumanDecision("Strong Fit")).toBe("Invest");
    expect(suggestedHumanDecision("Lower Priority")).toBe("Pass");
    expect(suggestedHumanDecision("Needs Information")).toBe("Watch");
    expect(suggestedHumanDecision(null)).toBeNull();
  });

  it("does not treat unclear sector as a strong qualification", () => {
    expect(
      qualificationLabel({
        passed: false,
        checks: [
          { name: "sector", passed: false, detail: "unclear" },
          { name: "ai_layer", passed: false, detail: "none" },
        ],
        flags: [],
        matchedAiTerms: [],
      }),
    ).toBe("Unclear");
  });
});
