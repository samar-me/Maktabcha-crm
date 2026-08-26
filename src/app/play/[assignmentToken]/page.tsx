import { StudentAssignmentArena } from "@/features/student-play/student-assignment-arena";

interface StudentPlayPageProps {
  params: Promise<{ assignmentToken: string }>;
}

export const metadata = {
  title: "Topshiriq — Maktabcha",
  description: "Telegram orqali interaktiv test topshirish",
};

export default async function StudentPlayPage({ params }: StudentPlayPageProps) {
  const { assignmentToken } = await params;
  return <StudentAssignmentArena publicToken={assignmentToken} />;
}
