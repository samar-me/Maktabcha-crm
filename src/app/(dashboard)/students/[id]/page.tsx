import * as React from "react";
import { StudentProfileView } from "@/features/students/student-profile-view";

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { id } = await params;
  return <StudentProfileView studentId={id} />;
}
