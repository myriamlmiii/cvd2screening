import type { ExternalSourceAdapter, RawSourceRecord } from "@/lib/domain/crm";
import { getPipeline } from "@/lib/airtable";
import { withBackoff } from "@/lib/retry";
import { z } from "zod";

const pipelineItem = z.object({
  id: z.string(),
  name: z.string(),
  dateEntered: z.string().nullable(),
  fundingSought: z.string().nullable(),
  description: z.string().nullable(),
  sector: z.string().nullable(),
  country: z.string().nullable(),
  status: z.string().nullable(),
  dateUpdated: z.string().nullable(),
  founder: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  source: z.string().nullable(),
  createdTime: z.string().nullable(),
});

export class AirtableAdapter implements ExternalSourceAdapter {
  id = "airtable";

  async discover(): Promise<RawSourceRecord[]> {
    const pipeline = await withBackoff(() => getPipeline());
    return pipeline.map((deal) => {
      const parsed = pipelineItem.parse(deal);
      return {
        sourceType: "AIRTABLE" as const,
        sourceName: "Airtable PIPELINE",
        externalId: parsed.id,
        sourceUrl: null,
        modifiedAt: parsed.dateUpdated,
        payload: { ...parsed },
      };
    });
  }

  async fetch(externalId: string): Promise<RawSourceRecord | null> {
    const all = await this.discover();
    return all.find((r) => r.externalId === externalId) ?? null;
  }
}
