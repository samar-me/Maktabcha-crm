"use server";

import { createClient } from "@/lib/supabase/server";
import {
  Homework,
  HomeworkInsert,
  HomeworkUpdate,
  HomeworkSubmission,
} from "@/types/database";
import { revalidatePath } from "next/cache";

export async function createHomeworkAction(
  homework: HomeworkInsert
): Promise<{ success: boolean; data?: Homework; error?: string }> {
  try {
    if (!homework.title || !homework.title.trim()) {
      return { success: false, error: "Vazifa sarlavhasi kiritilishi shart" };
    }
    if (!homework.group_id) {
      return { success: false, error: "Guruh tanlanishi shart" };
    }

    const supabase = await createClient();
    const { data, error } = await (supabase.from("homework") as any)
      .insert([
        {
          ...homework,
          title: homework.title.trim(),
          assigned_date: homework.assigned_date || new Date().toISOString().split("T")[0],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Server action error creating homework:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/homework");
    revalidatePath("/dashboard");
    return { success: true, data: data as Homework };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function updateHomeworkAction(
  id: string,
  updates: HomeworkUpdate
): Promise<{ success: boolean; data?: Homework; error?: string }> {
  try {
    if (!id) return { success: false, error: "Vazifa ID raqami ko‘rsatilmadi" };

    const supabase = await createClient();
    const { data, error } = await (supabase.from("homework") as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Server action error updating homework:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/homework");
    revalidatePath("/dashboard");
    return { success: true, data: data as Homework };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function deleteHomeworkAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: "Vazifa ID raqami ko‘rsatilmadi" };

    const supabase = await createClient();
    const { error } = await supabase.from("homework").delete().eq("id", id);

    if (error) {
      console.error("Server action error deleting homework:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/homework");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function saveBatchGradingAction(
  homeworkId: string,
  gradings: Array<{
    student_id: string;
    status: HomeworkSubmission["status"];
    score?: number | null;
    feedback?: string | null;
  }>
): Promise<{ success: boolean; data?: HomeworkSubmission[]; error?: string }> {
  try {
    if (!homeworkId) return { success: false, error: "Vazifa ID raqami ko‘rsatilmadi" };

    const supabase = await createClient();
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
      console.error("Server action error saving batch homework grading:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/homework");
    revalidatePath("/grades");
    return { success: true, data: data as HomeworkSubmission[] };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}
