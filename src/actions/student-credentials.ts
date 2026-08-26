"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { generateStudentNumericPassword, hashStudentPassword } from "@/lib/student-crypto";
import { revalidatePath } from "next/cache";

/**
 * Check whether a student already has an active assignment password
 */
export async function getStudentCredentialStatusAction(studentId: string): Promise<{
  hasPassword: boolean;
  updatedAt: string | null;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("student_credentials")
      .select("updated_at")
      .eq("student_id", studentId)
      .maybeSingle();

    if (error || !data) {
      return { hasPassword: false, updatedAt: null };
    }

    return { hasPassword: true, updatedAt: data.updated_at };
  } catch (err) {
    console.error("Error getting student credential status:", err);
    return { hasPassword: false, updatedAt: null };
  }
}

/**
 * Generate a new 6-digit numeric password for a student and save its salted hash
 * Returns the plaintext password ONCE for teacher presentation.
 */
export async function generateStudentPasswordAction(studentId: string): Promise<{
  success: boolean;
  plaintextPassword?: string;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // Verify student exists
    const { data: student, error: stErr } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("id", studentId)
      .single();

    if (stErr || !student) {
      return { success: false, error: "O‘quvchi topilmadi" };
    }

    // Generate random 6-digit code
    const plaintext = generateStudentNumericPassword(6);
    const { hash, salt } = await hashStudentPassword(plaintext);

    // Upsert into student_credentials
    const { error: upsertErr } = await supabase
      .from("student_credentials")
      .upsert(
        {
          student_id: studentId,
          password_hash: hash,
          password_salt: salt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      );

    if (upsertErr) {
      console.error("Error saving student password:", upsertErr);
      return { success: false, error: "Parolni saqlashda xatolik yuz berdi" };
    }

    revalidatePath(`/students/${studentId}`);
    return { success: true, plaintextPassword: plaintext };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik yuz berdi" };
  }
}

/**
 * Set a custom password for a student
 */
export async function setCustomStudentPasswordAction(
  studentId: string,
  customPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!customPassword || customPassword.trim().length < 4) {
      return { success: false, error: "Parol kamida 4 ta belgidan iborat bo‘lishi kerak" };
    }

    const supabase = createAdminClient();
    const { hash, salt } = await hashStudentPassword(customPassword.trim());

    const { error: upsertErr } = await supabase
      .from("student_credentials")
      .upsert(
        {
          student_id: studentId,
          password_hash: hash,
          password_salt: salt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      );

    if (upsertErr) {
      console.error("Error saving custom password:", upsertErr);
      return { success: false, error: "Parolni saqlashda xatolik yuz berdi" };
    }

    revalidatePath(`/students/${studentId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik yuz berdi" };
  }
}
