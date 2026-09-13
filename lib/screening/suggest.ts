import type { AiRecommendation, HumanDecision } from "@/types";

/** Display-only mapping. Never preselect this on the human decision control. */
export function suggestedHumanDecision(rec: AiRecommendation | null | undefined): HumanDecision | null {
  if (rec === "Strong Fit") return "Invest";
  if (rec === "Lower Priority") return "Pass";
  if (rec === "Review" || rec === "Needs Information" || rec === "Watch") return "Watch";
  return null;
}
