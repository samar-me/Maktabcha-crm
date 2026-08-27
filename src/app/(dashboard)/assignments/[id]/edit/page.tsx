import { getAssignmentById } from "@/services/assignments";
import { getGroups } from "@/services/groups";
import { AssignmentBuilder } from "@/features/assignments/assignment-builder";
import { notFound } from "next/navigation";
import { QuestionDraft } from "@/types/assignment";

interface EditAssignmentPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Topshiriqni tahrirlash — Maktabcha CRM",
};

export default async function EditAssignmentPage({ params }: EditAssignmentPageProps) {
  const { id } = await params;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const [assignment, groupsRes] = await Promise.all([
    getAssignmentById(id),
    supabase.from("groups").select("*").order("created_at", { ascending: false }),
  ]);

  const groups = (groupsRes.data || []) as any[];

  if (!assignment) {
    notFound();
  }

  const questionsDraft: QuestionDraft[] = assignment.questions.map((q) => ({
    position: q.position,
    questionText: q.question_text,
    options: q.options.map((opt) => ({
      position: opt.position,
      optionText: opt.option_text,
      isCorrect: opt.is_correct,
    })),
  }));

  const activeGroups = groups.filter((g) => g.status === "Faol");

  return (
    <AssignmentBuilder
      groups={activeGroups.length > 0 ? activeGroups : groups}
      initialData={{
        id: assignment.id,
        groupId: assignment.group_id,
        title: assignment.title,
        description: assignment.description,
        scoringBasePoints: assignment.scoring_base_points,
        scoringRankStep: assignment.scoring_rank_step,
        scoringMinPoints: assignment.scoring_min_points,
        antiCheatMode: assignment.anti_cheat_mode,
        questions: questionsDraft,
      }}
    />
  );
}
