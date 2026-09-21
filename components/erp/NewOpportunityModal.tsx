"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronDown, Database, FileUp, FolderKanban, Globe, Mail, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErpOverlay } from "@/components/erp/Overlay";
import { toast } from "@/components/ui/Toaster";

const STEPS = ["Import des sources", "Pré-remplissage", "Validation équipe", "Intégration pipeline"];
const SOURCES = [
  { icon: FolderKanban, label: "Google Meet" },
  { icon: Mail, label: "E-mail" },
  { icon: FileUp, label: "Pitch deck PDF" },
  { icon: FileUp, label: "Compte-rendu/transcript" },
  { icon: Database, label: "Data room/lien" },
  { icon: Globe, label: "Google Drive" },
];
const FIELDS = ["Startup", "Date d'entrée", "Pitch", "Secteur", "Financement recherché et valorisation", "Fiche U-investors", "Pays", "Description"];

const manualSchema = z.object({
  name: z.string().trim().min(2, "Nom requis (2 caractères min.)"),
  website: z.union([z.string().url("URL invalide"), z.literal("")]).optional(),
  sourceUrl: z.union([z.string().url("Lien invalide"), z.literal("")]).optional(),
});
type ManualValues = z.infer<typeof manualSchema>;

export function NewOpportunityModal({ onClose }: { onClose: () => void }) {
  const [manual, setManual] = useState(false);
  const form = useForm<ManualValues>({
    resolver: zodResolver(manualSchema),
    defaultValues: { name: "", website: "", sourceUrl: "" },
  });

  const submitManual = form.handleSubmit(() => {
    toast.message("Validation requise", {
      description: "Rien n'est créé en pipeline tant qu'un membre de l'équipe n'a pas validé.",
    });
  });

  return (
    <ErpOverlay onClose={onClose} panelClassName="max-h-[92vh] max-w-2xl overflow-y-auto">
        <div className="mb-1 flex items-start justify-between">
          <div>
            <h2 className="text-[18px] font-bold">Nouvelle opportunité</h2>
            <p className="text-[12px] text-ink-3">Création assistée par IA</p>
          </div>
          <button type="button" onClick={onClose} className="text-ink-3">
            ×
          </button>
        </div>
        <ol className="mb-5 mt-4 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="text-center">
              <span className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${i === 0 ? "bg-[#2563EB] text-white" : "border border-line text-ink-3"}`}>
                {i + 1}
              </span>
              <span className="text-[11px] text-ink-3">{s}</span>
            </li>
          ))}
        </ol>
        <div className="erp-card mb-4 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#2563EB]" />
            <span className="font-semibold">Import automatique</span>
            <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-medium text-[#15803d]">Méthode recommandée</span>
          </div>
          <p className="mb-3 text-[12px] text-ink-3">Déposez les sources du dossier. L'extraction n'écrit dans le pipeline qu'après validation.</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {SOURCES.map((s) => (
              <button key={s.label} type="button" className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-left text-[12px] hover:bg-[#F5F7FA]">
                <s.icon className="h-4 w-4 text-[#2563EB]" />
                {s.label}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-3">
            <Upload className="mx-auto mb-2 h-5 w-5" />
            Déposer les fichiers ou coller un lien
            <div className="mt-1 text-[11px]">PDF, PPT, DOCX, XLSX, lien Drive</div>
          </div>
        </div>
        <div className="mb-4 rounded-2xl border border-line p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">Champs détectés par l'IA</h3>
            <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] text-[#15803d]">0 sur {FIELDS.length} détectés</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px] text-ink-2">
            {FIELDS.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-line text-[#16A34A]">
                  <Check className="h-3 w-3 opacity-20" />
                </span>
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="mb-4 rounded-xl bg-[#FEF3C7] px-4 py-3 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#92400e]">Validation requise avant intégration</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[#b45309]">En attente de validation</span>
          </div>
          <p className="mt-1 text-[12px] text-[#92400e]/80">Rien n'est créé en base tant qu'un membre de l'équipe n'a pas validé. Pas de startup fictive.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => toast.message("Prévisualisation", { description: "Aucun champ IA détecté pour l'instant." })}>
            Prévisualiser la fiche
          </Button>
          <Button type="button" onClick={() => toast.message("Envoyé pour validation", { description: "Aucun dossier créé — sources d'abord." })}>
            Envoyer pour validation
          </Button>
        </div>
        <button type="button" onClick={() => setManual((v) => !v)} className="mt-4 flex w-full items-center justify-between text-[13px] text-ink-2">
          Saisie manuelle (si source non digitale)
          <ChevronDown className="h-4 w-4" />
        </button>
        {manual ? (
          <form className="mt-3 space-y-2" onSubmit={submitManual}>
            <label className="block text-[12px]">
              Nom
              <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("name")} />
              {form.formState.errors.name ? <span className="text-[#DC2626]">{form.formState.errors.name.message}</span> : null}
            </label>
            <label className="block text-[12px]">
              Site web
              <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" placeholder="https://" {...form.register("website")} />
              {form.formState.errors.website ? <span className="text-[#DC2626]">{form.formState.errors.website.message}</span> : null}
            </label>
            <Button type="submit" size="sm">
              Enregistrer le brouillon
            </Button>
          </form>
        ) : null}
    </ErpOverlay>
  );
}
