import { FilesDashboard } from "@/components/pages/FilesDashboard";
import { queryStartups } from "@/lib/startups/query";
import { slimDeal } from "@/lib/startups/slim";
import { supabaseAnon } from "@/lib/services/supabase-rest";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const result = await queryStartups({
    q: "",
    status: "all",
    sector: "all",
    rec: "all",
    queue: "0",
    sort: "name",
    page: 0,
    pageSize: 72,
  });
  const docs = await supabaseAnon<
    {
      external_file_id: string;
      filename: string;
      document_type: string | null;
      startup_id: string;
      mime_type: string | null;
    }[]
  >("startup_documents?select=external_file_id,filename,document_type,startup_id,mime_type&limit=60");
  return (
    <div className="animate-fade-in">
      <FilesDashboard
        initialList={{
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          rows: result.rows.map(slimDeal),
        }}
        recentDocs={docs.ok ? docs.data ?? [] : []}
      />
    </div>
  );
}
