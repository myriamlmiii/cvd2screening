import { AppChrome } from "@/components/shell/AppChrome";
import { getSituationPayload } from "@/lib/erp/payloads";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const situation = await getSituationPayload();
  return (
    <AppChrome taskCount={situation.taskCount} notifications={situation.notifications}>
      {children}
    </AppChrome>
  );
}
