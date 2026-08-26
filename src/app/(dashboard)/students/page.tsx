import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StudentListView } from "@/features/students/student-list-view";

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="O‘quvchilar"
        description="O‘quv markazidagi barcha o‘quvchilar ro‘yxati, shaxsiy ma'lumotlari, guruhlari va to‘lov holatlari"
      />
      <StudentListView />
    </div>
  );
}
