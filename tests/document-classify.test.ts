import { describe, expect, it } from "vitest";
import { classifyFromName, pickDescriptionText } from "@/lib/documents/categories";
import { engagementFactsFromDocs, engagementSignalFromFacts } from "@/lib/documents/engagement";

const DEVAITO = [
  { name: "Devaito Call 03022026.mp4", mime: "video/mp4" },
  { name: "DEVAITO x U-investors_NDA", mime: "application/vnd.google-apps.document" },
  { name: "DEVAITO x U-investors_NDA_SIGNED.pdf", mime: "application/pdf" },
  { name: "DEVAITO_BENCHMARK", mime: "application/vnd.google-apps.spreadsheet" },
  { name: "DEVAITO_BENCHMARK 2", mime: "application/vnd.google-apps.spreadsheet" },
  { name: "DEVAITO_PREP", mime: "application/vnd.google-apps.document" },
  { name: "Devaito_Rapport_Traction_FR (1).docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { name: "PitchD DEVAITO 3M.pdf", mime: "application/pdf" },
];

describe("Drive document classification", () => {
  it("types the eight DEVAITO files without collapsing benchmarks", () => {
    const types = DEVAITO.map((f) => classifyFromName(f.name, f.mime));
    expect(types).toEqual([
      "CALL_RECORDING",
      "NDA",
      "SIGNED_NDA",
      "BENCHMARK",
      "BENCHMARK",
      "FOLLOWUP",
      "TRACTION",
      "PITCH_DECK",
    ]);
  });

  it("fills description from pitch, then traction, never NDA or benchmark", () => {
    const text = pickDescriptionText([
      { filename: "DEVAITO x U-investors_NDA_SIGNED.pdf", text: "NDA terms" },
      { filename: "DEVAITO_BENCHMARK 2", text: "competitor table" },
      { filename: "PitchD DEVAITO 3M.pdf", text: "pitch overview of the product" },
      { filename: "Devaito_Rapport_Traction_FR (1).docx", text: "traction numbers" },
    ]);
    expect(text).toBe("pitch overview of the product");
  });

  it("uses traction when the pitch has no extractable text", () => {
    const text = pickDescriptionText([
      { filename: "PitchD DEVAITO 3M.pdf", text: null },
      { filename: "DEVAITO_BENCHMARK", text: "cells" },
      { filename: "Devaito_Rapport_Traction_FR (1).docx", text: "real traction report" },
    ]);
    expect(text).toBe("real traction report");
  });

  it("leaves description empty when only NDA/benchmark text exists", () => {
    expect(
      pickDescriptionText([
        { filename: "NDA.pdf", text: "confidential" },
        { filename: "BENCHMARK", text: "grid" },
      ]),
    ).toBeNull();
  });

  it("derives engagement from evidence facts, not a CRM stage", () => {
    const materials = engagementFactsFromDocs([{ document_type: "PITCH_DECK" }, { document_type: "NDA" }]);
    expect(engagementSignalFromFacts(materials)).toBe("Materials Received");
    const active = engagementFactsFromDocs([{ document_type: "PITCH_DECK" }, { document_type: "CALL_RECORDING" }]);
    expect(engagementSignalFromFacts(active)).toBe("Active Engagement");
    expect(engagementSignalFromFacts(engagementFactsFromDocs([{ document_type: "OTHER" }]))).toBe("Application Only");
  });
});
