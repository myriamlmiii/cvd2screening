import { ReviewDashboard } from "@/components/pages/ReviewDashboard";
import { queryStartups } from "@/lib/startups/query";
import { slimDeal } from "@/lib/startups/slim";
import { getStartupById } from "@/lib/screening";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: { status?: string; sector?: string; queue?: string; id?: string; rec?: string; q?: string };
}) {
  const queueOnly = searchParams.queue === "1";
  const result = await queryStartups({
    q: searchParams.q ?? "",
    status: searchParams.status ?? "all",
    sector: searchParams.sector ?? "all",
    rec: searchParams.rec ?? "all",
    queue: queueOnly ? "1" : "0",
    sort: "score",
    page: 0,
    pageSize: 40,
  });
  const selectedId = searchParams.id || result.rows[0]?.id;
  const selected = selectedId ? ((await getStartupById(selectedId)) ?? null) : null;
  return (
    <div className="animate-fade-in">
      <ReviewDashboard
        initialList={{
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          facets: result.facets,
          rows: result.rows.map(slimDeal),
        }}
        initialSelected={selected}
        initialStatus={searchParams.status ?? "all"}
        initialSector={searchParams.sector ?? "all"}
        initialId={searchParams.id ?? ""}
        queueOnly={queueOnly}
        initialRec={searchParams.rec ?? "all"}
        initialQ={searchParams.q ?? ""}
      />
    </div>
  );
}
