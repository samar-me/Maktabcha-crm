import { createClient } from "@/lib/supabase/client";
import {
  Homework,
  HomeworkInsert,
  HomeworkUpdate,
  HomeworkSubmission,
  HomeworkSubmissionInsert,
} from "@/types/database";

export async function getHomeworkList(groupId?: string): Promise<Homework[]> {
  const supabase = createClient();
  let query = supabase.from("homework").select("*").order("assigned_date", { ascending: false });

  if (groupId) {
    query = query.eq("group_id", groupId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching homework list:", error);
    throw new Error(error.message);
  }

  return (data || []) as Homework[];
}

export async function getHomeworkById(id: string): Promise<Homework | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("homework")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching homework by id:", error);
    throw new Error(error.message);
  }

  return data as Homework | null;
}

export async function createHomework(homework: HomeworkInsert): Promise<Homework> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("homework") as any)
    .insert([homework])
    .select()
    .single();

  if (error) {
    console.error("Error creating homework:", error);
    throw new Error(error.message);
  }

  return data as Homework;
}

export async function updateHomework(id: string, updates: HomeworkUpdate): Promise<Homework> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("homework") as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating homework:", error);
    throw new Error(error.message);
  }

  return data as Homework;
}

export async function deleteHomework(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("homework")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting homework:", error);
    throw new Error(error.message);
  }

  return true;
}

// Homework Submissions
export async function getHomeworkSubmissions(params?: {
  homeworkId?: string;
  studentId?: string;
}): Promise<HomeworkSubmission[]> {
  const supabase = createClient();
  let query = supabase.from("homework_submissions").select("*");

  if (params?.homeworkId) {
    query = query.eq("homework_id", params.homeworkId);
  }
  if (params?.studentId) {
    query = query.eq("student_id", params.studentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching homework submissions:", error);
    throw new Error(error.message);
  }

  return (data || []) as HomeworkSubmission[];
}

export async function saveHomeworkSubmission(
  submission: HomeworkSubmissionInsert
): Promise<HomeworkSubmission> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("homework_submissions") as any)
    .upsert(
      {
        ...submission,
        submitted_at: submission.submitted_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "homework_id,student_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error saving homework submission:", error);
    throw new Error(error.message);
  }

  return data as HomeworkSubmission;
}

export async function saveBatchHomeworkGrading(
  homeworkId: string,
  gradings: Array<{
    student_id: string;
    status: HomeworkSubmission["status"];
    score?: number | null;
    feedback?: string | null;
  }>
): Promise<HomeworkSubmission[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const records = gradings.map((g) => ({
    homework_id: homeworkId,
    student_id: g.student_id,
    status: g.status,
    score: g.score ?? null,
    feedback: g.feedback ?? null,
    submitted_at: now,
    updated_at: now,
  }));

  const { data, error } = await (supabase.from("homework_submissions") as any)
    .upsert(records, {
      onConflict: "homework_id,student_id",
    })
    .select();

  if (error) {
    console.error("Error saving batch homework grading:", error);
    throw new Error(error.message);
  }

  return (data || []) as HomeworkSubmission[];
}
