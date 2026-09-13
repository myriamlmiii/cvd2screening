import Link from "next/link";
import { DashCard } from "@/components/ui/Dash";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4 text-ink">
      <DashCard className="w-full max-w-sm">
        <div className="text-[13px] font-semibold">U-Investors</div>
        <p className="mt-2 text-[12px] text-ink-2">
          Team members sign into the CRM. Google Drive is a background ingest connection, not a login. Without AUTH_REQUIRED, this environment is open: pipeline data stays on the website for anyone who can reach it.
        </p>
        <Link href="/" className="mt-3 inline-flex h-8 items-center rounded-md bg-[#c4a57a] px-3 text-[11px] font-semibold text-[#1a1c18]">
          Continue to CRM
        </Link>
      </DashCard>
    </div>
  );
}
