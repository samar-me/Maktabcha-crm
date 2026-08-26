import * as React from "react";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { AttendanceManager } from "@/features/attendance/attendance-manager";

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Davomat"
        description="Guruhlar bo‘yicha tezkor davomat olish, «Barchasi keldi» ommaviy amali va ishtirok statistikasi"
      />
      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Davomat paneli yuklanmoqda...</div>}>
        <AttendanceManager />
      </Suspense>
    </div>
  );
}
