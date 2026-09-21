import { PortfolioBoard } from "@/components/erp/PortfolioBoard";
import { getPortfolioPayload } from "@/lib/erp/payloads";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const data = await getPortfolioPayload();
  return <PortfolioBoard data={data} />;
}
