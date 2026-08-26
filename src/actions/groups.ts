"use server";

import { createClient } from "@/lib/supabase/server";
import { Group, GroupInsert, GroupUpdate } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function createGroupAction(
  group: GroupInsert
): Promise<{ success: boolean; data?: Group; error?: string }> {
  try {
    if (!group.name || !group.name.trim()) {
      return { success: false, error: "Guruh nomi kiritilishi shart" };
    }
    if (!group.course_name || !group.course_name.trim()) {
      return { success: false, error: "Kurs yo‘nalishi kiritilishi shart" };
    }

    const supabase = await createClient();
    const { data, error } = await (supabase.from("groups") as any)
      .insert([
        {
          ...group,
          name: group.name.trim(),
          course_name: group.course_name.trim(),
          teacher_name: group.teacher_name.trim(),
          monthly_fee: Number(group.monthly_fee) || 0,
          schedule: group.schedule || [],
          status: group.status || "Faol",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Server action error creating group:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/groups");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true, data: data as Group };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function updateGroupAction(
  id: string,
  updates: GroupUpdate
): Promise<{ success: boolean; data?: Group; error?: string }> {
  try {
    if (!id) return { success: false, error: "Guruh ID raqami ko‘rsatilmadi" };

    const supabase = await createClient();
    const { data, error } = await (supabase.from("groups") as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Server action error updating group:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/groups/${id}`);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true, data: data as Group };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function deleteGroupAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: "Guruh ID raqami ko‘rsatilmadi" };

    const supabase = await createClient();
    const { error } = await supabase.from("groups").delete().eq("id", id);

    if (error) {
      console.error("Server action error deleting group:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/groups");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function enrollStudentAction(
  groupId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!groupId || !studentId) {
      return { success: false, error: "Guruh va o‘quvchi ID raqamlari talab qilinadi" };
    }

    const supabase = await createClient();
    const { error } = await (supabase.from("group_students") as any).upsert(
      {
        group_id: groupId,
        student_id: studentId,
        joined_at: new Date().toISOString().split("T")[0],
        status: "Faol",
      },
      { onConflict: "group_id,student_id" }
    );

    if (error) {
      console.error("Server action error enrolling student:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/groups");
    revalidatePath("/debtors");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function unenrollStudentAction(
  groupId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!groupId || !studentId) {
      return { success: false, error: "Guruh va o‘quvchi ID raqamlari talab qilinadi" };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("group_students")
      .delete()
      .eq("group_id", groupId)
      .eq("student_id", studentId);

    if (error) {
      console.error("Server action error unenrolling student:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/groups");
    revalidatePath("/debtors");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}
