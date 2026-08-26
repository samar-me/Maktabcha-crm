import { createClient } from "@/lib/supabase/client";
import { Grade, GradeInsert, GradeUpdate } from "@/types/database";

export async function getGrades(params?: {
  groupId?: string;
  studentId?: string;
  lessonId?: string;
}): Promise<Grade[]> {
  const supabase = createClient();
  let query = supabase.from("grades").select("*").order("date", { ascending: false });

  if (params?.groupId) {
    query = query.eq("group_id", params.groupId);
  }
  if (params?.studentId) {
    query = query.eq("student_id", params.studentId);
  }
  if (params?.lessonId) {
    query = query.eq("lesson_id", params.lessonId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching grades:", error);
    throw new Error(error.message);
  }

  return (data || []) as Grade[];
}

export async function saveGrade(grade: GradeInsert & { id?: string }): Promise<Grade> {
  const supabase = createClient();
  const now = new Date().toISOString();

  if (grade.id) {
    const { data, error } = await (supabase.from("grades") as any)
      .update({
        ...grade,
        updated_at: now,
      })
      .eq("id", grade.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating grade:", error);
      throw new Error(error.message);
    }
    return data as Grade;
  } else {
    const { data, error } = await (supabase.from("grades") as any)
      .insert([
        {
          student_id: grade.student_id,
          group_id: grade.group_id,
          lesson_id: grade.lesson_id || null,
          title: grade.title,
          score: grade.score,
          max_score: grade.max_score || 100,
          date: grade.date,
          notes: grade.notes || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating grade:", error);
      throw new Error(error.message);
    }
    return data as Grade;
  }
}

import { deleteGradeAction } from "@/actions/grades";

export async function deleteGrade(id: string): Promise<boolean> {
  const res = await deleteGradeAction(id);
  if (!res.success) {
    console.error("Error deleting grade:", res.error);
    throw new Error(res.error || "Bahoni o‘chirishda xatolik");
  }
  return true;
}

export async function getStudentGradeStats(studentId: string): Promise<{
  averageScore: number;
  totalGrades: number;
  highestScore: number;
  lowestScore: number;
}> {
  const grades = await getGrades({ studentId });
  if (grades.length === 0) {
    return { averageScore: 0, totalGrades: 0, highestScore: 0, lowestScore: 0 };
  }

  const scores = grades.map((g) => {
    const max = g.max_score || 100;
    return max > 0 ? (Number(g.score) / max) * 100 : 0;
  });

  const sum = scores.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / scores.length);
  const high = Math.round(Math.max(...scores));
  const low = Math.round(Math.min(...scores));

  return {
    averageScore: avg,
    totalGrades: grades.length,
    highestScore: high,
    lowestScore: low,
  };
}
