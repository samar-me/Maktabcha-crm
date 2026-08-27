import { notFound } from "next/navigation";
import {
  getCurriculumById,
  getCurriculumItemById,
} from "@/services/curriculum";
import { createClient } from "@/lib/supabase/server";
import { CurriculumItemDetailView } from "@/features/curriculum/curriculum-item-detail-view";

interface CurriculumItemDetailPageProps {
  params: Promise<{ id: string; itemId: string }>;
}

export async function generateMetadata({ params }: CurriculumItemDetailPageProps) {
  const { itemId } = await params;
  const item = await getCurriculumItemById(itemId);
  return {
    title: item ? `${item.title} — Ish reja` : "Mavzu — Maktabcha CRM",
  };
}

export default async function CurriculumItemDetailPage({
  params,
}: CurriculumItemDetailPageProps) {
  const { id, itemId } = await params;
  const supabase = await createClient();

  const [curriculum, item, { data: groupsData }] = await Promise.all([
    getCurriculumById(id),
    getCurriculumItemById(itemId),
    supabase.from("groups").select("*").order("name"),
  ]);

  if (!curriculum || !item) {
    notFound();
  }

  const groups = groupsData || [];
  const activeGroups = groups.filter((g) => g.status === "Faol");

  return (
    <CurriculumItemDetailView
      curriculum={curriculum}
      item={item}
      groups={activeGroups.length > 0 ? activeGroups : groups}
    />
  );
}
