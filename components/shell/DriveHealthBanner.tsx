"use client";

import { useQuery } from "@tanstack/react-query";

type Status = {
  drive: {
    connected: boolean;
    configured: boolean;
    lastSuccessAt: string | null;
    message: string;
    lastStatus: string | null;
  };
};

export function DriveHealthBanner() {
  const { data } = useQuery({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const res = await fetch("/api/sync/status");
      if (!res.ok) return null;
      return (await res.json()) as Status;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const drive = data?.drive;
  if (!drive || drive.configured === false) return null;
  if (drive.connected && drive.lastStatus !== "FAILED") return null;

  return (
    <div className="border-b border-line bg-surface-2 px-3 py-1.5 text-[11px] text-ink-2">
      {drive.message}
    </div>
  );
}
