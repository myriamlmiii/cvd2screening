import { OverviewDashboard } from "@/components/pages/OverviewDashboard";
import { getOverviewPayload } from "@/lib/startups/dashboard";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const initial = await getOverviewPayload({ status: "all", sector: "all", origin: "all" });
  return (
    <div className="animate-fade-in">
      <OverviewDashboard initial={initial} />
    </div>
  );
}
