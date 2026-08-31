import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AIContext, audit, authorize } from "./security";

export async function executeConfirmedAction(context: AIContext, confirmationId: string, phrase?: string) {
  const db: any = createAdminClient();
  const { data: pending } = await (db.from("ai_pending_actions") as any).select("*").eq("id", confirmationId).eq("organization_id", context.organizationId).eq("user_id", context.userId).eq("status", "pending").gt("expires_at", new Date().toISOString()).single();
  if (!pending) throw new Error("CONFIRMATION_NOT_FOUND_OR_EXPIRED");
  authorize(context, pending.risk_level);
  if (pending.confirmation_phrase && phrase !== pending.confirmation_phrase) throw new Error("CONFIRMATION_PHRASE_INVALID");

  const input = pending.input as any;
  let before: unknown = null, after: unknown = null;
  try {
    if (pending.tool === "students.moveGroup") {
      const { data: membership } = await (db.from("group_students") as any).select("*").eq("organization_id", context.organizationId).eq("student_id", input.studentId).eq("group_id", input.fromGroupId).single();
      if (!membership) throw new Error("ACTIVE_MEMBERSHIP_NOT_FOUND");
      before = membership;
      const { data, error } = await (db.rpc as any)("ai_move_student_group", { p_organization_id: context.organizationId, p_student_id: input.studentId, p_from_group_id: input.fromGroupId, p_to_group_id: input.toGroupId });
      if (error) throw error; after = data;
    } else if (pending.tool === "billing.createException") {
      const { data, error } = await (db.from("billing_exceptions") as any).insert({ organization_id: context.organizationId, student_id: input.studentId, group_id: input.groupId || null, starts_on: input.startsOn, ends_on: input.endsOn, billing_type: input.discountPercentage === 100 ? "scholarship" : "discount", discount_percentage: input.discountPercentage, display_as_paid: input.displayAsPaid, include_in_revenue: input.includeInRevenue, suppress_debt_notifications: input.suppressDebtNotifications, restore_previous_tariff: true, reason: input.reason, created_by: context.userId }).select().single();
      if (error) throw error; after = data;
    } else if (pending.tool === "referral.attach") {
      const { data: existing } = await db.from("referrals").select("id").eq("organization_id",context.organizationId).eq("referred_student_id",input.referredStudentId).maybeSingle();
      if(existing) throw new Error("REFERRAL_ALREADY_ATTACHED");
      const {data,error}=await db.from("referrals").insert({organization_id:context.organizationId,referrer_student_id:input.referrerStudentId,referred_student_id:input.referredStudentId,status:"pending"}).select().single();if(error)throw error;after=data;
    } else if (pending.tool === "referral.cancel") {
      const {data:r}=await db.from("referrals").select("*").eq("organization_id",context.organizationId).eq("id",input.referralId).single();if(!r)throw new Error("REFERRAL_NOT_FOUND");before=r;
      const {data,error}=await db.from("referrals").update({status:"cancelled",cancelled_at:new Date().toISOString(),cancellation_reason:input.reason}).eq("id",r.id).select().single();if(error)throw error;await db.from("discounts").update({active:false}).eq("organization_id",context.organizationId).eq("referral_id",r.id);after=data;
    } else throw new Error("TOOL_NOT_EXECUTABLE");

    await (db.from("ai_pending_actions") as any).update({ status: "executed", executed_at: new Date().toISOString() }).eq("id", pending.id).eq("status", "pending");
    await audit(context, { ai_request: null, tool: pending.tool, risk_level: pending.risk_level, entity_type: pending.tool.split(".")[0], before_data: before, after_data: after, confirmation: { id: confirmationId, phraseProvided: Boolean(phrase) }, status: "success" });
    return { success: true, tool: pending.tool, result: after };
  } catch (error: any) {
    await (db.from("ai_pending_actions") as any).update({ status: "failed" }).eq("id", pending.id);
    await audit(context, { tool: pending.tool, risk_level: pending.risk_level, before_data: before, status: "failed", error: error.message });
    throw error;
  }
}
