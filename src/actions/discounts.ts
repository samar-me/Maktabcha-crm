"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { StudentDiscount } from "@/types/discounts";

export async function calculateMonthlyWinnerAction(groupId: string, month: number, year: number) {
  try {
    const supabase = await createClient();
    
    // Check if discount already exists for this group/month/year
    const { data: existing } = await supabase
      .from("student_discounts")
      .select("id")
      .eq("group_id", groupId)
      .eq("month", month)
      .eq("year", year)
      .eq("reason", "Oy g'olibi")
      .maybeSingle();
      
    if (existing) {
      return { success: false, error: "Bu guruh va oy uchun g'olib avvalroq aniqlangan." };
    }

    // Fetch all completed assignments for the group in the given month and year
    // Since we don't have closed_at easily filterable via simple supabase queries in one go for attempts,
    // we fetch assignments in the month, then attempts for those.
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data: assignments, error: assignErr } = await supabase
      .from("assignments")
      .select("id")
      .eq("group_id", groupId)
      .eq("status", "Yakunlangan")
      .gte("closed_at", startDate)
      .lte("closed_at", endDate);

    if (assignErr) throw new Error(assignErr.message);
    if (!assignments || assignments.length === 0) {
      return { success: false, error: "Bu oyda yakunlangan topshiriqlar topilmadi." };
    }

    const assignmentIds = (assignments as any[]).map(a => a.id);

    // Fetch all attempts for these assignments
    const { data: attempts, error: attErr } = await supabase
      .from("assignment_attempts")
      .select("student_id, final_score")
      .in("assignment_id", assignmentIds)
      .eq("status", "completed");

    if (attErr) throw new Error(attErr.message);
    if (!attempts || attempts.length === 0) {
      return { success: false, error: "Bu oyda o'quvchilar tomonidan yechilgan testlar topilmadi." };
    }

    // Calculate totals
    const studentScores: Record<string, number> = {};
    for (const attempt of (attempts as any[])) {
      if (!studentScores[attempt.student_id]) {
        studentScores[attempt.student_id] = 0;
      }
      studentScores[attempt.student_id] += (attempt.final_score || 0);
    }

    // Find the max
    let topStudentId = "";
    let maxScore = -1;
    for (const [sId, score] of Object.entries(studentScores)) {
      if (score > maxScore) {
        maxScore = score;
        topStudentId = sId;
      }
    }

    if (!topStudentId) {
      return { success: false, error: "G'olibni aniqlab bo'lmadi." };
    }

    // Insert discount
    const { error: insErr } = await supabase
      .from("student_discounts")
      .insert({
        student_id: topStudentId,
        group_id: groupId,
        month,
        year,
        discount_percentage: 20,
        reason: "Oy g'olibi",
        is_used: false,
      } as any);

    if (insErr) throw new Error(insErr.message);

    revalidatePath("/reports");
    revalidatePath("/payments");
    return { success: true, topStudentId, maxScore };
  } catch (err: any) {
    return { success: false, error: err.message || "Xatolik yuz berdi" };
  }
}
