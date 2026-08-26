import { notFound } from "next/navigation";
import {
  getCurriculumById,
  getCurriculumItems,
  getCurriculumProgress,
} from "@/services/curriculum";
import { getGroups } from "@/services/groups";
import { CurriculumDetailView } from "@/features/curriculum/curriculum-detail-view";

interface CurriculumDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CurriculumDetailPageProps) {
  const { id } = await params;
  const curriculum = await getCurriculumById(id);
  return {
    title: curriculum ? `${curriculum.name} — Maktabcha CRM` : "Ish reja — Maktabcha CRM",
  };
}

export default async function CurriculumDetailPage({ params }: CurriculumDetailPageProps) {
  const { id } = await params;

  const [curriculum, items, progress, groups] = await Promise.all([
    getCurriculumById(id),
    getCurriculumItems(id),
    getCurriculumProgress(id),
    getGroups(),
  ]);

  if (!curriculum) {
    notFound();
  }

  const activeGroups = groups.filter((g) => g.status === "Faol");

  return (
    <CurriculumDetailView
      curriculum={curriculum}
      initialItems={items}
      initialProgress={progress}
      groups={activeGroups.length > 0 ? activeGroups : groups}
    />
  );
}
