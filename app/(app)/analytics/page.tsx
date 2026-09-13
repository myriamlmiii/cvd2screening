import { AnalyticsDashboard } from "@/components/pages/AnalyticsDashboard";
import { getAnalyticsPayload } from "@/lib/startups/dashboard";

export const revalidate = 60;

export default async function AnalyticsPage() {
  const initial = await getAnalyticsPayload(0);
  return (
    <div className="animate-fade-in">
      <AnalyticsDashboard initial={initial} />
    </div>
  );
}
