import { describe, expect, it } from "vitest";
import { EXTRACT_MAX_BYTES, shouldSkipExtraction } from "@/lib/services/drive-extract";

describe("Drive extraction policy", () => {
  it("never extracts video or images", () => {
    expect(shouldSkipExtraction("video/mp4", 1024)).toBe(true);
    expect(shouldSkipExtraction("image/png", 2048)).toBe(true);
  });

  it("skips extraction above the 20MB cap", () => {
    expect(shouldSkipExtraction("application/pdf", 44.4 * 1024 * 1024)).toBe(true);
    expect(shouldSkipExtraction("application/pdf", 19 * 1024 * 1024)).toBe(false);
    expect(EXTRACT_MAX_BYTES).toBe(20 * 1024 * 1024);
  });

  it("does not skip a typical Google Doc with unknown size", () => {
    expect(shouldSkipExtraction("application/vnd.google-apps.document", null)).toBe(false);
  });
});
