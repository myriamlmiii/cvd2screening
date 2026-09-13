import { describe, expect, it } from "vitest";
import { contentHash, normalizeDomain, normalizeName, normalizeUrl } from "@/lib/normalize";
import { mapAirtableStatus, normalizeRawRecord } from "@/lib/services/normalize-service";
import { resolveIdentity } from "@/lib/services/identity";
import { dataCompleteness } from "@/lib/data-quality";

describe("normalization", () => {
  it("collapses website variants to one domain", () => {
    expect(normalizeDomain("https://www.example.com/")).toBe("example.com");
    expect(normalizeDomain("http://example.com")).toBe("example.com");
    expect(normalizeDomain("[www.example.com/]")).toBe("example.com");
    expect(normalizeUrl("example.com/path")).toBe("https://example.com");
  });

  it("normalizes company names", () => {
    expect(normalizeName("Acme SAS")).toBe("acme");
    expect(normalizeName("Acme  Inc.")).toBe("acme");
  });

  it("maps Airtable pipeline statuses to CRM statuses", () => {
    expect(mapAirtableStatus("À contacter")).toBe("New");
    expect(mapAirtableStatus("En étude")).toBe("Review");
    expect(mapAirtableStatus("Déclinée")).toBe("Passed");
  });

  it("hashes content for incremental skip", () => {
    expect(contentHash(["A", "b"])).toBe(contentHash(["a", "B"]));
  });
});

describe("identity", () => {
  it("matches existing external ids first", () => {
    const hit = resolveIdentity({
      sourceType: "AIRTABLE",
      externalId: "rec1",
      existingByExternalId: "rec1",
      candidates: [],
      incoming: normalizeRawRecord({
        sourceType: "AIRTABLE",
        sourceName: "Airtable",
        externalId: "rec1",
        payload: { name: "Acme", website: "https://acme.com" },
      }),
    });
    expect(hit?.reason).toBe("external_id");
    expect(hit?.confidence).toBe("high");
  });

  it("does not auto-merge low-confidence name matches as high", () => {
    const incoming = normalizeRawRecord({
      sourceType: "GOOGLE_DRIVE",
      sourceName: "Drive",
      externalId: "file1",
      payload: { name: "Atlas AI Labs" },
    });
    const hit = resolveIdentity({
      sourceType: "GOOGLE_DRIVE",
      externalId: "file1",
      candidates: [{ id: "s1", name: "Atlas AI", website: null, normalized_domain: null, normalized_name: "atlas ai" }],
      incoming,
    });
    expect(hit?.confidence).toBe("low");
  });
});

describe("data completeness", () => {
  it("treats missing traction as unknown, not a failing score", () => {
    const c = dataCompleteness({ name: "Acme", website: "https://acme.com", description: "x", sector: "Fintech" });
    expect(c.missing).toContain("traction");
    expect(c.pct).toBeGreaterThan(0);
    expect(c.pct).toBeLessThan(100);
  });
});
