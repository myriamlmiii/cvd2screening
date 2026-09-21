"use client";

import { useLocale } from "@/lib/i18n";
import { StatusChip } from "@/components/erp/ui";

export function T({ k, vars }: { k: string; vars?: Record<string, string | number> }) {
  const { t } = useLocale();
  return <>{t(k, vars)}</>;
}

export function ActiveChip({ on }: { on: boolean }) {
  const { t } = useLocale();
  return <StatusChip label={on ? t("erp.setActive") : t("erp.setInactive")} tone={on ? "green" : "slate"} />;
}
