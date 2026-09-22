"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronDown, Database, FileUp, FolderKanban, Globe, Mail, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErpOverlay } from "@/components/erp/Overlay";
import { toast } from "@/components/ui/Toaster";
import { useLocale } from "@/lib/i18n";

const STEPS = ["erp.oppStep1", "erp.oppStep2", "erp.oppStep3", "erp.oppStep4"] as const;
const SOURCES = [
  { icon: FolderKanban, key: "erp.oppMeet" },
  { icon: Mail, key: "erp.oppEmail" },
  { icon: FileUp, key: "erp.oppDeck" },
  { icon: FileUp, key: "erp.oppTranscript" },
  { icon: Database, key: "erp.oppDataRoom" },
  { icon: Globe, key: "erp.oppDrive" },
] as const;
const FIELDS = [
  "erp.oppFieldStartup",
  "erp.oppFieldEntry",
  "erp.oppFieldPitch",
  "erp.oppFieldSector",
  "erp.oppFieldFunding",
  "erp.oppFieldFiche",
  "erp.oppFieldCountry",
  "erp.oppFieldDesc",
] as const;

type ManualValues = { name: string; website?: string; sourceUrl?: string };

export function NewOpportunityModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const [manual, setManual] = useState(false);
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t("erp.oppNameReq")),
        website: z.union([z.string().url(t("erp.oppBadUrl")), z.literal("")]).optional(),
        sourceUrl: z.union([z.string().url(t("erp.oppBadLink")), z.literal("")]).optional(),
      }),
    [t],
  );
  const form = useForm<ManualValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", website: "", sourceUrl: "" },
  });

  const submitManual = form.handleSubmit(() => {
    toast.message(t("erp.oppValidTitle"), { description: t("erp.oppValidBody") });
  });

  return (
    <ErpOverlay onClose={onClose} panelClassName="max-h-[92vh] max-w-2xl overflow-y-auto">
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h2 className="text-[18px] font-bold">{t("erp.oppTitle")}</h2>
          <p className="text-[12px] text-ink-3">{t("erp.oppAi")}</p>
        </div>
        <button type="button" onClick={onClose} className="text-ink-3" aria-label={t("erp.close")}>
          ×
        </button>
      </div>
      <ol className="mb-5 mt-4 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="text-center">
            <span
              className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${i === 0 ? "bg-cvd text-white" : "border border-line text-ink-3"}`}
            >
              {i + 1}
            </span>
            <span className="text-[11px] text-ink-3">{t(s)}</span>
          </li>
        ))}
      </ol>
      <div className="erp-card mb-4 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cvd" />
          <span className="font-semibold">{t("erp.oppAuto")}</span>
          <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-medium text-[#15803d] dark:bg-emerald-950/70 dark:text-emerald-300">
            {t("erp.oppRecommended")}
          </span>
        </div>
        <p className="mb-3 text-[12px] text-ink-3">{t("erp.oppDropHint")}</p>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {SOURCES.map((s) => (
            <button key={s.key} type="button" className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-left text-[12px] hover:bg-canvas">
              <s.icon className="h-4 w-4 text-cvd" />
              {t(s.key)}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-3">
          <Upload className="mx-auto mb-2 h-5 w-5" />
          {t("erp.oppDrop")}
          <div className="mt-1 text-[11px]">{t("erp.oppFormats")}</div>
        </div>
      </div>
      <div className="mb-4 rounded-2xl border border-line p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold">{t("erp.oppFields")}</h3>
          <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] text-[#15803d] dark:bg-emerald-950/70 dark:text-emerald-300">
            {t("erp.oppDetected", { n: FIELDS.length })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px] text-ink-2">
          {FIELDS.map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-line text-positive">
                <Check className="h-3 w-3 opacity-20" />
              </span>
              {t(f)}
            </div>
          ))}
        </div>
      </div>
      <div className="mb-4 rounded-xl bg-[#FEF3C7] px-4 py-3 text-[13px] dark:bg-amber-950/50">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#92400e] dark:text-amber-200">{t("erp.oppNeedValid")}</span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-[#b45309] dark:text-amber-300">{t("erp.oppPending")}</span>
        </div>
        <p className="mt-1 text-[12px] text-[#92400e]/80 dark:text-amber-200/80">{t("erp.oppNoFake")}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={() => toast.message(t("erp.oppPreviewTitle"), { description: t("erp.oppPreviewBody") })}>
          {t("erp.oppPreview")}
        </Button>
        <Button type="button" onClick={() => toast.message(t("erp.oppSentTitle"), { description: t("erp.oppSentBody") })}>
          {t("erp.oppSendValid")}
        </Button>
      </div>
      <button type="button" onClick={() => setManual((v) => !v)} className="mt-4 flex w-full items-center justify-between text-[13px] text-ink-2">
        {t("erp.oppManual")}
        <ChevronDown className="h-4 w-4" />
      </button>
      {manual ? (
        <form className="mt-3 space-y-2" onSubmit={submitManual}>
          <label className="block text-[12px]">
            {t("erp.oppName")}
            <input className="mt-1 h-10 w-full rounded-lg border border-line bg-transparent px-3" {...form.register("name")} />
            {form.formState.errors.name ? <span className="text-critical">{form.formState.errors.name.message}</span> : null}
          </label>
          <label className="block text-[12px]">
            {t("erp.oppWebsite")}
            <input className="mt-1 h-10 w-full rounded-lg border border-line bg-transparent px-3" placeholder="https://" {...form.register("website")} />
            {form.formState.errors.website ? <span className="text-critical">{form.formState.errors.website.message}</span> : null}
          </label>
          <Button type="submit" size="sm">
            {t("erp.oppSaveDraft")}
          </Button>
        </form>
      ) : null}
    </ErpOverlay>
  );
}
