import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { LessonListView } from "@/features/lessons/lesson-list-view";

export default function LessonsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Darslar"
        description="Rejalashtirilgan va o‘tkazilgan darslar jurnali, dars mavzulari va uy vazifalari"
      />
      <LessonListView />
    </div>
  );
}
