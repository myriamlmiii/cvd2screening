export type IcMemo = {
  recommendation: "Strong Fit" | "Review" | "Needs Information" | "Watch" | "Lower Priority";
  conviction: "High" | "Medium" | "Low";
  thesis: string;
  justification: string[];
  gaps: string[];
  nextAction: string;
};
