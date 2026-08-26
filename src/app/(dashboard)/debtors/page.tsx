import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DebtorListView } from "@/features/debtors/debtor-list-view";

export default function DebtorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Qarzdorlar"
        description="Oylik to‘lovlarni kechiktirgan o‘quvchilar ro‘yxati, qarz summalari va tezkor to‘lov qabul qilish"
      />
      <DebtorListView />
    </div>
  );
}
