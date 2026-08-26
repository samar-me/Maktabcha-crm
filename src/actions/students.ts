"use server";

import { createClient } from "@/lib/supabase/server";
import { Student, StudentInsert, StudentUpdate } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function createStudentAction(
  student: StudentInsert
): Promise<{ success: boolean; data?: Student; error?: string }> {
  try {
    if (!student.first_name || !student.first_name.trim()) {
      return { success: false, error: "O‘quvchi ismi kiritilishi shart" };
    }

    const supabase = await createClient();
    const { data, error } = await (supabase.from("students") as any)
      .insert([
        {
          ...student,
          first_name: student.first_name.trim(),
          last_name: student.last_name ? student.last_name.trim() : null,
          phone: student.phone ? student.phone.trim() : null,
          parent_name: student.parent_name ? student.parent_name.trim() : null,
          parent_phone: student.parent_phone ? student.parent_phone.trim() : null,
          status: student.status || "Faol",
          joined_at: student.joined_at || new Date().toISOString().split("T")[0],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Server action error creating student:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/debtors");
    return { success: true, data: data as Student };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function updateStudentAction(
  id: string,
  updates: StudentUpdate
): Promise<{ success: boolean; data?: Student; error?: string }> {
  try {
    if (!id) return { success: false, error: "O‘quvchi ID raqami ko‘rsatilmadi" };

    const supabase = await createClient();
    const { data, error } = await (supabase.from("students") as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Server action error updating student:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/students/${id}`);
    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/debtors");
    return { success: true, data: data as Student };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function deleteStudentAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: "O‘quvchi ID raqami ko‘rsatilmadi" };

    const supabase = await createClient();
    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) {
      console.error("Server action error deleting student:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/debtors");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}
