"use server";

import { createClient } from "@/lib/supabase/server";
import { Attendance, AttendanceInsert } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function saveBatchAttendanceAction(
  records: Array<AttendanceInsert>
): Promise<{ success: boolean; data?: Attendance[]; error?: string }> {
  try {
    if (!records || records.length === 0) {
      return { success: false, error: "Saqlash uchun davomat yozuvlari mavjud emas" };
    }

    const supabase = await createClient();
    const { data, error } = await (supabase.from("attendance") as any)
      .upsert(records, {
        onConflict: "lesson_id,student_id",
      })
      .select();

    if (error) {
      console.error("Server action error saving batch attendance:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true, data: data as Attendance[] };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}
