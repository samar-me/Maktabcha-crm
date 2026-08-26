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
