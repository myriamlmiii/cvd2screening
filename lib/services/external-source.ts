import type { ExternalSourceAdapter, RawSourceRecord } from "@/lib/domain/crm";

/** Future directories/accelerators implement this. They persist through StartupService. */
export abstract class ExternalSourceAdapterBase implements ExternalSourceAdapter {
  abstract id: string;
  async discover(): Promise<RawSourceRecord[]> {
    return [];
  }
  async fetch(_externalId: string): Promise<RawSourceRecord | null> {
    return null;
  }
}
