"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FileSearch, FileText, Paperclip, Search, Send, Sparkles, Users } from "lucide-react";
import type { AssistantContext } from "@/lib/erp/payloads";
import { NoteText } from "@/components/erp/NoteText";
import { toast } from "@/components/ui/Toaster";
import { useLocale } from "@/lib/i18n";

const PRESETS = [
  { label: "erp.aiBrief", desc: "erp.aiBriefDesc", prompt: "erp.aiPromptBrief", Icon: FileText, color: "bg-cvd-soft text-cvd" },
  { label: "erp.aiIc", desc: "erp.aiIcDesc", prompt: "erp.aiPromptIc", Icon: Users, color: "bg-[#DCFCE7] text-[#16A34A] dark:bg-emerald-950/70 dark:text-emerald-300" },
  { label: "erp.aiDoc", desc: "erp.aiDocDesc", prompt: "erp.aiPromptDoc", Icon: FileSearch, color: "bg-[#EDE9FE] text-[#7c3aed] dark:bg-violet-950/70 dark:text-violet-300" },
  { label: "erp.aiSearch", desc: "erp.aiSearchDesc", prompt: "erp.aiPromptSearch", Icon: Search, color: "bg-[#FEF3C7] text-[#D97706] dark:bg-amber-950/70 dark:text-amber-300" },
] as const;

const CHIPS = ["erp.aiChip1", "erp.aiChip2", "erp.aiChip3"] as const;

function Sections({ text }: { text: string }) {
  return <NoteText text={text} className="text-[13px] text-ink-2" />;
}

export function AssistantHome({ context }: { context: AssistantContext }) {
  const { t } = useLocale();
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const history = messages.filter((m) => m.role === "user").slice(-5);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    const res = await fetch("/api/ai/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, startupId: context.focus[0]?.id }),
    });
    const json = (await res.json()) as { reply?: string; error?: string };
    setBusy(false);
    if (!res.ok || !json.reply) {
      const err = json.error || t("erp.aiUnavailable");
      setError(err);
      toast.error(err);
      return;
    }
    setMessages((m) => [...m, { role: "assistant", text: json.reply! }]);
    requestAnimationFrame(() => box.current?.scrollTo({ top: 9e9, behavior: "smooth" }));
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-ink">{t("erp.aiTitle")}</h1>
        <p className="text-[13px] text-ink-3">{t("erp.aiSubtitle")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => send(t(p.prompt))} className="erp-card flex items-start gap-3 p-4 text-left hover:shadow-elevate">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${p.color}`}>
              <p.Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[13px] font-semibold">{t(p.label)}</span>
              <span className="block text-[12px] text-ink-3">{t(p.desc)}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <section className="erp-card flex min-h-[520px] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[13px]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cvd-soft text-cvd">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="font-semibold">{t("erp.aiAssistant")}</div>
              <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-medium text-[#15803d] dark:bg-emerald-950/70 dark:text-emerald-300">
                {t("erp.aiConnected")}
              </span>
            </div>
          </div>
          <div ref={box} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13px]">
            <div className="rounded-2xl bg-canvas p-4">
              {t("erp.aiHello")}
              <div className="mt-3 flex flex-wrap gap-2">
                {CHIPS.map((s) => (
                  <button key={s} type="button" onClick={() => send(t(s))} className="rounded-full border border-line bg-surface px-3 py-1 text-[12px] hover:bg-cvd-soft">
                    {t(s)}
                  </button>
                ))}
              </div>
            </div>
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-12 flex justify-end gap-2">
                  <div className="rounded-2xl bg-cvd px-3 py-2 text-white">{m.text}</div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cvd text-[11px] font-bold text-white">D</span>
                </div>
              ) : (
                <div key={i} className="mr-8 rounded-2xl bg-canvas px-3 py-3">
                  <Sections text={m.text} />
                </div>
              ),
            )}
            {busy ? <div className="text-[12px] text-ink-3">{t("erp.aiWorking")}</div> : null}
            {error ? <div className="text-[12px] text-critical">{error}</div> : null}
          </div>
          <form
            className="flex items-center gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Paperclip className="h-4 w-4 text-ink-3" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("erp.aiPlaceholder")}
              className="h-11 flex-1 rounded-xl border border-line bg-transparent px-3 text-[13px] outline-none focus:ring-2 focus:ring-cvd/30"
            />
            <FileText className="h-4 w-4 text-ink-3" />
            <button type="submit" className="flex h-11 w-11 items-center justify-center rounded-xl bg-cvd text-white" disabled={busy} aria-label={t("erp.aiSend")}>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
        <aside className="space-y-4">
          <div className="erp-card p-4">
            <h3 className="mb-2 text-[13px] font-semibold">{t("erp.aiSources")}</h3>
            <div className="text-[12px] font-medium text-ink-2">{t("erp.aiUsed")}</div>
            <ul className="mt-1 space-y-1.5 text-[12px] text-ink-2">
              {context.focus.slice(0, 6).map((d) => (
                <li key={d.id}>
                  <Link href={`/pipeline/${d.id}`} className="hover:text-cvd">
                    {d.name}
                  </Link>
                  <span className="text-ink-3"> · {d.why}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[12px] font-medium">{t("erp.aiFilters")}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded-full bg-cvd-soft px-2 py-0.5 text-[11px] text-cvd">{t("erp.navPipeline")}</span>
              <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px]">{t("erp.navDocuments")}</span>
            </div>
            <div className="mt-3 text-[12px] font-medium">{t("erp.aiHistory")}</div>
            <ul className="mt-1 space-y-1 text-[12px] text-ink-3">
              {history.length === 0 ? <li>{t("erp.aiNoQuery")}</li> : history.map((h, i) => <li key={i}>{h.text.slice(0, 60)}</li>)}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
