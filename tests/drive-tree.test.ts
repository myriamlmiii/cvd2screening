import { describe, expect, it } from "vitest";
import { isYearFolderName } from "@/lib/services/drive-ingest";

describe("Drive year / startup boundary", () => {
  it("treats 2024–2026 as year folders", () => {
    expect(isYearFolderName("2024")).toBe(true);
    expect(isYearFolderName("2025")).toBe(true);
    expect(isYearFolderName("2026")).toBe(true);
  });

  it("does not treat a startup name as a year", () => {
    expect(isYearFolderName("10MG Health")).toBe(false);
    expect(isYearFolderName("2024 intake")).toBe(false);
  });
});
