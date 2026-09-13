import { getScoredPipeline } from "@/lib/screening";
import { facets, filterStartups, paginate, startupQuerySchema } from "@/lib/startups/filter";

export { facets, filterStartups, paginate, startupQuerySchema };
export type { StartupQuery } from "@/lib/startups/filter";

export async function queryStartups(raw: unknown) {
  const query = startupQuerySchema.parse(raw);
  const all = await getScoredPipeline();
  if (query.id) {
    const hit = all.find((d) => d.id === query.id);
    return { query, ...paginate(hit ? [hit] : [], 0, 1), facets: facets(all) };
  }
  const filtered = filterStartups(all, query);
  return { query, ...paginate(filtered, query.page, query.pageSize), facets: facets(all) };
}
