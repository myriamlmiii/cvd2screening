import { AssistantHome } from "@/components/erp/AssistantHome";
import { getAssistantContext } from "@/lib/erp/payloads";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const context = await getAssistantContext();
  return <AssistantHome context={context} />;
}
