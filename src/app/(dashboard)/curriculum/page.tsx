import { getCurricula } from "@/services/curriculum";
import { getGroups } from "@/services/groups";
import { CurriculumListView } from "@/features/curriculum/curriculum-list-view";

export const metadata = {
  title: "Ish reja / O‘quv dasturi — Maktabcha CRM",
  description: "O‘quv dasturlari, rejalashtirilgan mavzular va testlar boshqaruvi",
};

export default async function CurriculumPage() {
  const [curricula, groups] = await Promise.all([
    getCurricula(),
    getGroups(),
  ]);

  const activeGroups = groups.filter((g) => g.status === "Faol");

  return (
    <CurriculumListView
      initialCurricula={curricula}
      groups={activeGroups.length > 0 ? activeGroups : groups}
    />
  );
}
