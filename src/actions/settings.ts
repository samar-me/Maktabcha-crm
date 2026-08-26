"use server";

import { createClient } from "@/lib/supabase/server";
import { SystemSettings } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function updateSettingsAction(
  updates: Partial<Omit<SystemSettings, "id" | "created_at" | "updated_at">>
): Promise<{ success: boolean; data?: SystemSettings; error?: string }> {
  try {
    const supabase = await createClient();

    // Fetch existing settings
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const targetId = (existing as any)?.id || "a0000000-0000-0000-0000-000000000001";

    const { data, error } = await (supabase.from("settings") as any)
      .upsert({
        id: targetId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Server action error updating settings:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true, data: data as SystemSettings };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

/**
 * Clear all demo / test data (Students, Groups, Attendance, Payments, Grades, Lessons, Homework).
 * Keeps system settings and PIN configuration intact.
 */
export async function clearAllDemoDataAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Delete in cascade order
    await supabase.from("attendance").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("homework_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("grades").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("homework").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("lessons").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("group_students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("groups").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Error clearing demo data:", err);
    return { success: false, error: err.message || "Test ma'lumotlarini o‘chirishda xatolik" };
  }
}
