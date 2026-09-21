import { AgendaBoard } from "@/components/erp/AgendaBoard";
import { getAgendaPayload } from "@/lib/erp/payloads";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const data = await getAgendaPayload();
  return <AgendaBoard data={data} />;
}
