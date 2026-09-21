import { notFound } from "next/navigation";
import { CompanyFiche } from "@/components/erp/CompanyFiche";
import { getFichePayload } from "@/lib/erp/payloads";

export const dynamic = "force-dynamic";

export default async function PortfolioFiche({ params }: { params: { id: string } }) {
  const data = await getFichePayload(params.id);
  if (!data) notFound();
  return <CompanyFiche data={data} backHref="/portfolio" backLabel="Portefeuille" />;
}
