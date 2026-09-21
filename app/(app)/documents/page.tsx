import { getScoredPipeline } from "@/lib/screening";
import { supabaseAnon } from "@/lib/services/supabase-rest";
import { DocumentsBoard, type DocRow } from "@/components/erp/DocumentsBoard";
import { sourceDocuments } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [docs, deals] = await Promise.all([
    supabaseAnon<
      {
        external_file_id: string;
        filename: string | null;
        document_type: string | null;
        startup_id: string | null;
        mime_type: string | null;
        source_url?: string | null;
      }[]
    >("startup_documents?select=external_file_id,filename,document_type,startup_id,mime_type,source_url&order=filename.asc&limit=400"),
    getScoredPipeline(),
  ]);
  const names = Object.fromEntries(deals.map((d) => [d.id, d.name]));
  const fromDb: DocRow[] = (docs.data ?? []).map((r) => ({
    ...r,
    openHref: r.source_url || `/api/documents/${encodeURIComponent(r.external_file_id)}/open`,
  }));
  const fromCrm: DocRow[] = [];
  if (fromDb.length === 0) {
    for (const deal of deals) {
      for (const file of sourceDocuments(deal)) {
        fromCrm.push({
          external_file_id: `${deal.id}:${file.label}`,
          filename: `${deal.name} - ${file.label}`,
          document_type: file.documentType || null,
          startup_id: deal.id,
          mime_type: file.mimeType || null,
          openHref: file.href,
        });
      }
    }
  }
  const rows = fromDb.length ? fromDb : fromCrm;
  for (const d of deals) names[d.id] = d.name;
  return <DocumentsBoard rows={rows} names={names} />;
}
