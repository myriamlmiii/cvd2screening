"use client";

import { ErpSidebar } from "@/components/erp/Sidebar";
import { ErpHeader } from "@/components/erp/Header";
import { CommandPalette } from "@/components/CommandPalette";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { DriveHealthBanner } from "@/components/shell/DriveHealthBanner";
import type { SituationPayload } from "@/lib/erp/payloads";

export function AppChrome({
  children,
  taskCount,
  notifications,
}: {
  children: React.ReactNode;
  taskCount: number;
  notifications: SituationPayload["notifications"];
}) {
  return (
    <QueryProvider>
        <div className="min-h-screen bg-canvas">
          <ErpSidebar taskCount={taskCount} />
          <div className="md:pl-[230px]">
            <ErpHeader notifications={notifications} />
            <DriveHealthBanner />
            <main className="px-4 py-5 md:px-6 md:py-6">{children}</main>
          </div>
          <CommandPalette />
        </div>
    </QueryProvider>
  );
}
