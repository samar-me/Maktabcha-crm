import { createClient } from "@/lib/supabase/client";
import { Payment, PaymentInsert, PaymentUpdate } from "@/types/database";

export async function getPayments(params?: {
  studentId?: string;
  groupId?: string;
  month?: number;
  year?: number;
}): Promise<Payment[]> {
  const supabase = createClient();
  let query = supabase.from("payments").select("*").order("payment_date", { ascending: false });

  if (params?.studentId) {
    query = query.eq("student_id", params.studentId);
  }
  if (params?.groupId) {
    query = query.eq("group_id", params.groupId);
  }
  if (params?.month) {
    query = query.eq("month", params.month);
  }
  if (params?.year) {
    query = query.eq("year", params.year);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching payments:", error);
    throw new Error(error.message);
  }

  return (data || []) as Payment[];
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching payment by id:", error);
    throw new Error(error.message);
  }

  return data as Payment | null;
}

export async function createPayment(payment: PaymentInsert): Promise<Payment> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("payments") as any)
    .insert([payment])
    .select()
    .single();

  if (error) {
    console.error("Error creating payment:", error);
    throw new Error(error.message);
  }

  return data as Payment;
}

export async function updatePayment(id: string, updates: PaymentUpdate): Promise<Payment> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("payments") as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating payment:", error);
    throw new Error(error.message);
  }

  return data as Payment;
}

import { deletePaymentAction } from "@/actions/payments";

export async function deletePayment(id: string): Promise<boolean> {
  const res = await deletePaymentAction(id);
  if (!res.success) {
    console.error("Error deleting payment:", res.error);
    throw new Error(res.error || "To‘lovni o‘chirishda xatolik");
  }
  return true;
}

export async function getPaymentsByStudentId(studentId: string): Promise<Payment[]> {
  return getPayments({ studentId });
}
