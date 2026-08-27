import { createClient } from "@/lib/supabase/client";
import { StudentDiscount, StudentDiscountInsert } from "@/types/discounts";

export async function getStudentDiscounts(studentId?: string): Promise<StudentDiscount[]> {
  const supabase = createClient();
  let query = (supabase.from("student_discounts") as any).select("*").order("created_at", { ascending: false });
  if (studentId) {
    query = query.eq("student_id", studentId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as StudentDiscount[];
}

export async function getUnusedDiscount(studentId: string): Promise<StudentDiscount | null> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("student_discounts") as any)
    .select("*")
    .eq("student_id", studentId)
    .eq("is_used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as StudentDiscount | null;
}

export async function createStudentDiscount(discount: StudentDiscountInsert): Promise<StudentDiscount> {
  const supabase = createClient();
  const payload: any = discount;
  const { data, error } = await (supabase.from("student_discounts") as any)
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as StudentDiscount;
}

export async function markDiscountAsUsed(id: string): Promise<void> {
  const supabase = createClient();
  const payload: any = { is_used: true };
  const { error } = await (supabase.from("student_discounts") as any)
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);
}
