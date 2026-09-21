"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { useLocale } from "@/lib/i18n";

export function DriveSyncButton() {
  const { t } = useLocale();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/sync/drive", { method: "POST" });
    const json = (await res.json()) as { status?: string; stats?: Record<string, number>; error?: string; message?: string };
    setBusy(false);
    if (!res.ok) {
      const err = json.error || json.message || t("erp.syncFail");
      setMsg(err);
      toast.error(err);
      return;
    }
    const s = json.stats;
    const ok = s
      ? t("erp.syncOk", { startups: s.startups ?? 0, seen: s.seen ?? 0, created: s.created ?? 0, failed: s.failed ?? 0 })
      : json.status || t("erp.syncDone");
    setMsg(ok);
    toast.success(ok);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={run} disabled={busy}>
        {busy ? t("erp.syncBusy") : t("erp.syncRun")}
      </Button>
      {msg ? <p className="text-[13px] text-ink-2">{msg}</p> : null}
    </div>
  );
}
