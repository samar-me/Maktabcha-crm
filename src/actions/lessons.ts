"use server";

import { createClient } from "@/lib/supabase/server";
import { Lesson, LessonInsert, LessonUpdate } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function createLessonAction(
  lesson: LessonInsert
): Promise<{ success: boolean; data?: Lesson; error?: string }> {
  try {
    if (!lesson.group_id) return { success: false, error: "Guruh tanlanishi shart" };
    if (!lesson.topic || !lesson.topic.trim()) return { success: false, error: "Dars mavzusi kiritilishi shart" };
    if (!lesson.date) return { success: false, error: "Dars sanasi kiritilishi shart" };

    const supabase = await createClient();
    const { data, error } = await (supabase.from("lessons") as any)
      .insert([
        {
          ...lesson,
          topic: lesson.topic.trim(),
          start_time: lesson.start_time || "14:00",
          end_time: lesson.end_time || "16:00",
          status: lesson.status || "Rejalashtirilgan",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Server action error creating lesson:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/lessons");
    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    return { success: true, data: data as Lesson };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function updateLessonAction(
  id: string,
  updates: LessonUpdate
): Promise<{ success: boolean; data?: Lesson; error?: string }> {
  try {
    if (!id) return { success: false, error: "Dars ID raqami ko‘rsatilmadi" };

    const supabase = await createClient();
    const { data, error } = await (supabase.from("lessons") as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Server action error updating lesson:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/lessons/${id}`);
    revalidatePath("/lessons");
    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    return { success: true, data: data as Lesson };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function deleteLessonAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: "Dars ID raqami ko‘rsatilmadi" };

    const supabase = await createClient();
    const { error } = await supabase.from("lessons").delete().eq("id", id);

    if (error) {
      console.error("Server action error deleting lesson:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/lessons");
    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}
