"use server";

import { createClient } from "@/lib/supabase/server";
import { Grade, GradeInsert, GradeUpdate } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function saveGradeAction(
  grade: GradeInsert & { id?: string }
): Promise<{ success: boolean; data?: Grade; error?: string }> {
  try {
    if (!grade.student_id) return { success: false, error: "O‘quvchi tanlanishi shart" };
    if (!grade.group_id) return { success: false, error: "Guruh tanlanishi shart" };
    if (!grade.title || !grade.title.trim()) return { success: false, error: "Nazorat nomi kiritilishi shart" };

    const supabase = await createClient();
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
        console.error("Server action error updating grade:", error);
        return { success: false, error: error.message };
      }
      revalidatePath("/grades");
      revalidatePath(`/students/${grade.student_id}`);
      return { success: true, data: data as Grade };
    } else {
      const { data, error } = await (supabase.from("grades") as any)
        .insert([
          {
            student_id: grade.student_id,
            group_id: grade.group_id,
            lesson_id: grade.lesson_id || null,
            title: grade.title.trim(),
            score: Number(grade.score) || 0,
            max_score: Number(grade.max_score) || 100,
            date: grade.date || now.split("T")[0],
            notes: grade.notes ? grade.notes.trim() : null,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Server action error creating grade:", error);
        return { success: false, error: error.message };
      }
      revalidatePath("/grades");
      revalidatePath(`/students/${grade.student_id}`);
      return { success: true, data: data as Grade };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function deleteGradeAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: "Baho ID raqami ko‘rsatilmadi" };

    const supabase = await createClient();
    const { error } = await supabase.from("grades").delete().eq("id", id);

    if (error) {
      console.error("Server action error deleting grade:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/grades");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}
