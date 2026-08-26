import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { GradeListView } from "@/features/grades/grade-list-view";

export default function GradesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Baholar"
        description="O‘quvchilarning sinov, imtihon va oraliq nazorat natijalari jurnali"
      />
      <GradeListView />
    </div>
  );
}
