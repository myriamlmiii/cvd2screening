import { describe, expect, it } from "vitest";
import { parseFunding } from "@/lib/funding";

describe("parseFunding", () => {
  it("parses messy French ask text", () => {
    const p = parseFunding("1,5M USD pour 19% (Seed)");
    expect(p?.amount).toBe(1_500_000);
    expect(p?.currency).toBe("USD");
    expect(p?.percentage).toBe(19);
    expect(p?.kind).toBe("unknown");
  });

  it("marks N/D as not disclosed", () => {
    expect(parseFunding("N/D")?.disclosed).toBe(false);
  });
});
