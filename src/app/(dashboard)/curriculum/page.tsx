import { getCurricula } from "@/services/curriculum";
import { createClient } from "@/lib/supabase/server";
import { CurriculumListView } from "@/features/curriculum/curriculum-list-view";

export const metadata = {
  title: "Ish reja / O‘quv dasturi — Maktabcha CRM",
  description: "O‘quv dasturlari, rejalashtirilgan mavzular va testlar boshqaruvi",
};

export default async function CurriculumPage() {
  const supabase = await createClient();
  
  const [curricula, { data: groupsData }] = await Promise.all([
    getCurricula(),
    supabase.from("groups").select("*").order("name"),
  ]);

  const groups = (groupsData as any[]) || [];
  const activeGroups = groups.filter((g) => g.status === "Faol");

  return (
    <CurriculumListView
      initialCurricula={curricula}
      groups={activeGroups.length > 0 ? activeGroups : groups}
    />
  );
}
