import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ReportsView } from "@/features/reports/reports-view";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hisobotlar & Tahlil"
        description="Moliya, to‘lovlar, davomat, guruhlar to‘laligi va o‘sish ko‘rsatkichlari bo‘yicha vizual tahliliy grafiklar"
      />
      <ReportsView />
    </div>
  );
}
