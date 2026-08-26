import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { GroupListView } from "@/features/groups/group-list-view";

export default function GroupsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Guruhlar"
        description="Mavjud o‘quv guruhlari, kurslar, haftalik dars jadvallari va oylik to‘lov tariflari"
      />
      <GroupListView />
    </div>
  );
}
