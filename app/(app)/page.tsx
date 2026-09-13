import { redirect } from "next/navigation";
import { OverviewDashboard } from "@/components/pages/OverviewDashboard";
import { getOverviewPayload } from "@/lib/startups/dashboard";
import { exchangeGoogleAuthCode } from "@/lib/google/oauth";
import { ingestGoogleDrive } from "@/lib/services/drive-ingest";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: { code?: string } }) {
  if (searchParams.code) {
    const exchanged = await exchangeGoogleAuthCode(searchParams.code);
    if (exchanged.ok) {
      try {
        await ingestGoogleDrive();
      } catch {
        // CRM tables may not exist yet; token is still saved.
      }
    }
    redirect("/");
  }
  const initial = await getOverviewPayload({ status: "all", sector: "all", origin: "all" });
  return (
    <div className="animate-fade-in">
      <OverviewDashboard initial={initial} />
    </div>
  );
}
