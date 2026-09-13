import { describe, expect, it } from "vitest";
import { duplicateMatch } from "@/lib/duplicate";

describe("duplicateMatch", () => {
  it("treats same domain as high confidence", () => {
    const m = duplicateMatch({ name: "Acme", website: "https://acme.com" }, { name: "Acme SAS", website: "http://www.acme.com/fr" });
    expect(m?.confidence).toBe("high");
  });

  it("flags similar names without auto-merge", () => {
    const m = duplicateMatch({ name: "Acme Payments Group" }, { name: "Acme Payments" });
    expect(m?.confidence).toBe("low");
  });
});
