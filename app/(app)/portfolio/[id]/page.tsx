import { redirect } from "next/navigation";

export default function PortfolioCompany({ params }: { params: { id: string } }) {
  redirect(`/review?id=${encodeURIComponent(params.id)}`);
}
