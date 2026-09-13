import { redirect } from "next/navigation";

export default function PipelineCompany({ params }: { params: { id: string } }) {
  redirect(`/review?id=${encodeURIComponent(params.id)}`);
}
