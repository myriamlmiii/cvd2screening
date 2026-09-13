import { duplicateMatch } from "@/lib/duplicate";
import type { DuplicateConfidence, NormalizedStartup, StartupRow } from "@/lib/domain/crm";

export type IdentityHit = {
  startupId: string;
  confidence: DuplicateConfidence;
  reason: "external_id" | "domain" | "name";
};

export function resolveIdentity(input: {
  sourceType: string;
  externalId: string;
  existingByExternalId?: string | null;
  candidates: Pick<StartupRow, "id" | "name" | "website" | "normalized_domain" | "normalized_name">[];
  incoming: NormalizedStartup;
}): IdentityHit | null {
  if (input.existingByExternalId) {
    return { startupId: input.existingByExternalId, confidence: "high", reason: "external_id" };
  }
  if (input.incoming.normalizedDomain) {
    const domainHit = input.candidates.find((c) => c.normalized_domain && c.normalized_domain === input.incoming.normalizedDomain);
    if (domainHit) return { startupId: domainHit.id, confidence: "high", reason: "domain" };
  }
  const nameExact = input.candidates.find((c) => c.normalized_name === input.incoming.normalizedName && input.incoming.normalizedName.length >= 3);
  if (nameExact) {
    const fuzzy = duplicateMatch(
      { name: input.incoming.name, website: input.incoming.website },
      { name: nameExact.name, website: nameExact.website },
    );
    return { startupId: nameExact.id, confidence: fuzzy?.confidence === "high" ? "high" : "low", reason: "name" };
  }
  for (const c of input.candidates) {
    const m = duplicateMatch({ name: input.incoming.name, website: input.incoming.website }, { name: c.name, website: c.website });
    if (m?.confidence === "low") return { startupId: c.id, confidence: "low", reason: "name" };
  }
  return null;
}
