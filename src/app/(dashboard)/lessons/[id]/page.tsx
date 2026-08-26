import * as React from "react";
import { LessonDetailView } from "@/features/lessons/lesson-detail-view";

interface LessonDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonDetailPage({ params }: LessonDetailPageProps) {
  const { id } = await params;
  return <LessonDetailView lessonId={id} />;
}
