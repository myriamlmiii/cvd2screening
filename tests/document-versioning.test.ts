import { describe, expect, it } from "vitest";
import { assignDocumentVersions, logicalStem } from "@/lib/documents/versioning";

describe("document version groups", () => {
  it("groups pitch deck revisions without deleting originals", () => {
    const versions = assignDocumentVersions("startup-1", [
      { external_file_id: "a", filename: "Pitch Deck.pdf", document_type: "PITCH_DECK", modified_time: "2026-01-01" },
      { external_file_id: "b", filename: "Pitch Deck v2.pdf", document_type: "PITCH_DECK", modified_time: "2026-03-01" },
      { external_file_id: "c", filename: "Pitch Deck FINAL.pdf", document_type: "PITCH_DECK", modified_time: "2026-06-01" },
      { external_file_id: "d", filename: "Pitch Deck FINAL 2.pdf", document_type: "PITCH_DECK", modified_time: "2026-09-01" },
    ]);
    expect(logicalStem("Pitch Deck FINAL 2.pdf")).toBe("pitch deck");
    expect(versions.get("a")?.version).toBe(1);
    expect(versions.get("d")?.isLatest).toBe(true);
    expect(versions.get("d")?.versions).toBe(4);
    expect(new Set([...versions.values()].map((v) => v.group)).size).toBe(1);
  });
});
