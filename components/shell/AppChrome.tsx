"use client";

import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { DriveHealthBanner } from "@/components/shell/DriveHealthBanner";
import { CommandPalette } from "@/components/CommandPalette";
import { RouteSkin } from "@/components/shell/RouteSkin";
import { LocaleProvider } from "@/lib/i18n";
import { QueryProvider } from "@/components/providers/QueryProvider";

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <QueryProvider>
        <div className="min-h-screen bg-canvas">
          <RouteSkin />
          <Sidebar />
          <div className="md:pl-[168px]">
            <TopBar />
            <DriveHealthBanner />
            <main className="px-3 py-2 md:px-3">{children}</main>
          </div>
          <CommandPalette />
        </div>
      </QueryProvider>
    </LocaleProvider>
  );
}
