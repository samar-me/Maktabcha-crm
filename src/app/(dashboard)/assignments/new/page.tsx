import { getGroups } from "@/services/groups";
import { NewAssignmentPageView } from "@/features/assignments/new-assignment-page-view";

interface NewAssignmentPageProps {
  searchParams: Promise<{
    mode?: string;
    lessonId?: string;
    groupId?: string;
    curriculumItemId?: string;
  }>;
}

export const metadata = {
  title: "Yangi topshiriq yaratish — Maktabcha CRM",
  description: "AI yordamida tezkor yoki qo‘lda yangi test topshirig‘i yaratish",
};

export default async function NewAssignmentPage({ searchParams }: NewAssignmentPageProps) {
  const { mode, lessonId, groupId, curriculumItemId } = await searchParams;
  const groups = await getGroups();
  const activeGroups = groups.filter((g) => g.status === "Faol");

  const initialMode = mode === "manual" ? "manual" : "ai";

  return (
    <NewAssignmentPageView
      groups={activeGroups.length > 0 ? activeGroups : groups}
      initialMode={initialMode}
      initialLessonId={lessonId}
      initialGroupId={groupId}
      initialCurriculumItemId={curriculumItemId}
    />
  );
}
