import { PipelineBoard } from "@/components/erp/PipelineBoard";
import { getPipelinePayload } from "@/lib/erp/payloads";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const data = await getPipelinePayload();
  return <PipelineBoard data={data} />;
}
