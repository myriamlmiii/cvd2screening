import { EXTRACT_MAX_BYTES, isImageMime, isVideoMime } from "@/lib/services/drive-extract";
import type { DocumentType } from "@/lib/documents/categories";

export type ProcessingStatus =
  | "AVAILABLE"
  | "CLASSIFIED"
  | "EXTRACTED"
  | "NOT_PROCESSED"
  | "FAILED";

export type ProcessingPlan = {
  tier: 1 | 2 | 3 | 4;
  status: ProcessingStatus;
  skipExtract: boolean;
  reason: string | null;
};

/** Tier 1 metadata + tier 2 classify always. Tier 3 extract when cheap. Tier 4 never during sync. */
export function processingPlan(mimeType: string, size?: number | null, type?: DocumentType | null): ProcessingPlan {
  if (isVideoMime(mimeType) || type === "CALL_RECORDING") {
    return { tier: 4, status: "NOT_PROCESSED", skipExtract: true, reason: "Large media file — transcription is async, never during sync" };
  }
  if (isImageMime(mimeType)) {
    return { tier: 2, status: "CLASSIFIED", skipExtract: true, reason: "Image — reference only" };
  }
  if (typeof size === "number" && size > EXTRACT_MAX_BYTES) {
    return { tier: 2, status: "NOT_PROCESSED", skipExtract: true, reason: "Over 20MB extraction cap" };
  }
  return { tier: 3, status: "CLASSIFIED", skipExtract: false, reason: null };
}
