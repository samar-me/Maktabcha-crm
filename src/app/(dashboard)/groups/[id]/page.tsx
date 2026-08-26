import * as React from "react";
import { GroupDetailView } from "@/features/groups/group-detail-view";

interface GroupDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const { id } = await params;
  return <GroupDetailView groupId={id} />;
}
