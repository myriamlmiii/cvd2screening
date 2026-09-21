import { SituationHome } from "@/components/erp/SituationHome";
import { getSituationPayload } from "@/lib/erp/payloads";

export const dynamic = "force-dynamic";

export default async function SituationPage() {
  const data = await getSituationPayload();
  return <SituationHome data={data} />;
}
