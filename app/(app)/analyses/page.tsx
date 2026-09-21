import { AnalysesBoard, analysesDeals } from "@/components/erp/AnalysesBoard";
import { getPipelinePayload } from "@/lib/erp/payloads";
import { getScoredPipeline } from "@/lib/screening";

export const dynamic = "force-dynamic";

export default async function AnalysesPage() {
  const [pipeline, deals] = await Promise.all([getPipelinePayload(), getScoredPipeline()]);
  return <AnalysesBoard pipeline={pipeline} deals={analysesDeals(deals)} />;
}
