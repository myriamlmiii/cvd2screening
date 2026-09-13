import { WorkflowDashboard } from "@/components/pages/WorkflowDashboard";
import { getWorkflowPayload } from "@/lib/startups/dashboard";

export const revalidate = 60;

export default async function WorkflowPage() {
  const initial = await getWorkflowPayload();
  return (
    <div className="animate-fade-in">
      <WorkflowDashboard initial={initial} />
    </div>
  );
}
