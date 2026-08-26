import { AssignmentDetailView } from "@/features/assignments/assignment-detail-view";

interface AssignmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Topshiriq tafsilotlari — Maktabcha CRM",
};

export default async function AssignmentDetailPage({ params }: AssignmentDetailPageProps) {
  const { id } = await params;
  return <AssignmentDetailView assignmentId={id} />;
}
