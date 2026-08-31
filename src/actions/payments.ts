"use server";

import { createClient } from "@/lib/supabase/server";
import { Payment, PaymentInsert, PaymentUpdate } from "@/types/database";
import { revalidatePath } from "next/cache";
import { requireAIContext } from "@/lib/ai/security";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createPaymentAction(
  payment: PaymentInsert
): Promise<{ success: boolean; data?: Payment; error?: string }> {
  try {
    if (!payment.student_id) {
      return { success: false, error: "O‘quvchi tanlanishi shart" };
    }
    if (!payment.group_id) {
      return { success: false, error: "Guruh tanlanishi shart" };
    }
    const amount = Number(payment.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "To‘lov summasi 0 dan katta bo‘lishi shart" };
    }
    if (!payment.payment_date) {
      return { success: false, error: "To‘lov sanasi kiritilishi shart" };
    }

    const validMethods = ["Naqd", "Karta", "O‘tkazma", "Boshqa"];
    const method = validMethods.includes(payment.payment_method || "")
      ? payment.payment_method
      : "Karta";

    const context = await requireAIContext();
    const supabase: any = createAdminClient();
    const { data: discount } = await supabase.rpc("calculate_student_discount", { p_organization_id: context.organizationId, p_student_id: payment.student_id, p_group_id: payment.group_id, p_base_amount: amount, p_on_date: payment.payment_date });
    const bill = discount || { baseAmount: amount, discountPercent: 0, discountAmount: 0, finalAmount: amount, discountType: null, paymentStatus: "paid", includeInRevenue: true };
    const { data, error } = await (supabase.from("payments") as any)
      .insert([
        {
          student_id: payment.student_id,
          group_id: payment.group_id,
          organization_id: context.organizationId,
          amount: Number(bill.finalAmount),
          base_amount: amount,
          discount_percent: Number(bill.discountPercent || 0),
          discount_amount: Number(bill.discountAmount || 0),
          final_amount: Number(bill.finalAmount),
          discount_type: bill.discountType,
          payment_status: "paid",
          include_in_revenue: Number(bill.finalAmount) > 0,
          payment_date: payment.payment_date,
          payment_method: method,
          month: payment.month || new Date().getMonth() + 1,
          year: payment.year || new Date().getFullYear(),
          note: payment.note ? payment.note.trim() : null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Server action error creating payment:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/debtors");
    revalidatePath("/reports");
    revalidatePath(`/students/${payment.student_id}`);
    return { success: true, data: data as Payment };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function updatePaymentAction(
  id: string,
  updates: PaymentUpdate
): Promise<{ success: boolean; data?: Payment; error?: string }> {
  try {
    if (!id) return { success: false, error: "To‘lov ID raqami ko‘rsatilmadi" };

    if (updates.amount !== undefined && (isNaN(Number(updates.amount)) || Number(updates.amount) <= 0)) {
      return { success: false, error: "To‘lov summasi musbat son bo‘lishi kerak" };
    }

    const supabase = await createClient();
    const { data, error } = await (supabase.from("payments") as any)
      .update({
        ...updates,
        amount: updates.amount !== undefined ? Number(updates.amount) : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Server action error updating payment:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/debtors");
    revalidatePath("/reports");
    return { success: true, data: data as Payment };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}

export async function deletePaymentAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: "To‘lov ID raqami ko‘rsatilmadi" };

    const supabase = await createClient();
    const { error } = await supabase.from("payments").delete().eq("id", id);

    if (error) {
      console.error("Server action error deleting payment:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/debtors");
    revalidatePath("/reports");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik" };
  }
}
