import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentListView } from "@/features/payments/payment-list-view";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="To‘lovlar"
        description="O‘quvchilar to‘lovlari jurnali, kvitansiyalar va oylik tushum ko‘rsatkichlari"
      />
      <PaymentListView />
    </div>
  );
}
