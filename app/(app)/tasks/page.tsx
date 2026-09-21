import { TasksBoard } from "@/components/erp/TasksBoard";
import { getTasksPayload } from "@/lib/erp/payloads";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const data = await getTasksPayload();
  return <TasksBoard data={data} />;
}
