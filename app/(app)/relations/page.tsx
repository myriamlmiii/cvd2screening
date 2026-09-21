import { RelationsBoard } from "@/components/erp/RelationsBoard";
import { getRelationsPayload } from "@/lib/erp/payloads";

export const dynamic = "force-dynamic";

export default async function RelationsPage() {
  const data = await getRelationsPayload();
  return <RelationsBoard data={data} />;
}
