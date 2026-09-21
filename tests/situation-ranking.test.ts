import { describe, expect, it } from "vitest";
import { isClosedLost, prioritize } from "@/lib/crm";
import { whyNow } from "@/lib/erp/model";
import { clipText } from "@/lib/text";
import { deal } from "./fixtures";

describe("situation ranking", () => {
  it("drops declined / out-of-thesis files from the priority list", () => {
    const declined = deal({
      name: "75Way",
      status: "Déclinée",
      update: "**75 Way**\n**CONCLUSION :** Projet non conforme à notre thèse d'investissement.",
    });
    const live = deal({ name: "Afdal", status: "En étude" });
    expect(isClosedLost(declined)).toBe(true);
    expect(prioritize([declined, live]).map((d) => d.name)).toEqual(["Afdal"]);
  });

  it("ranks shortlist / IC ahead of new leads when scores are missing", () => {
    const future = deal({ name: "10MG Health", status: "Opportunité future" });
    const study = deal({ name: "Afdal", status: "En étude" });
    const lead = deal({ name: "NewCo", status: "À contacter" });
    expect(prioritize([lead, study, future]).map((d) => d.name)).toEqual(["10MG Health", "Afdal", "NewCo"]);
  });
});

describe("whyNow", () => {
  it("uses each file's own update instead of a shared term-sheet phrase", () => {
    const paylik = deal({
      name: "PayLik",
      termSheetUrl: "https://drive.google.com/file/d/aaa/view",
      update: "PayLik — closing call with the founder this week.",
    });
    const ocytric = deal({
      name: "Ocytric",
      termSheetUrl: "https://drive.google.com/file/d/bbb/view",
      update: "Ocytric — waiting on the data room index.",
    });
    expect(whyNow(paylik)).toContain("PayLik");
    expect(whyNow(ocytric)).toContain("Ocytric");
    expect(whyNow(paylik)).not.toBe(whyNow(ocytric));
  });

  it("says term sheet received only when the URL looks like a term sheet and there is no update", () => {
    const withDoc = deal({ name: "A", termSheetUrl: "https://drive.google.com/file/term-sheet-v2.pdf" });
    const genericLink = deal({ name: "B", termSheetUrl: "https://drive.google.com/drive/folders/xyz", status: "En étude" });
    expect(whyNow(withDoc)).toBe("Term sheet reçue");
    expect(whyNow(genericLink)).not.toBe("Term sheet reçue");
  });
});

describe("clipText", () => {
  it("truncates on a word boundary with an ellipsis", () => {
    const text = "Initiativ est une bourse numérique qui utilise la blockchain pour simplifier, accélérer et sécuriser";
    const clipped = clipText(text, 72);
    expect(clipped.endsWith("…")).toBe(true);
    expect(clipped.includes("simplifi")).toBe(false);
    expect(clipped.endsWith("pour…") || clipped.includes("blockchain")).toBe(true);
  });
});
