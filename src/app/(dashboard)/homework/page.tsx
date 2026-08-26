import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { HomeworkListView } from "@/features/homework/homework-list-view";

export default function HomeworkPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Uy vazifalari"
        description="Guruhlar bo‘yicha topshiriqlar, topshirilish jarayoni va tezkor baholash"
      />
      <HomeworkListView />
    </div>
  );
}
