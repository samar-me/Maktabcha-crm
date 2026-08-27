import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const overdueParams = z.object({ _dummy: z.string().optional() });
export const getOverduePaymentsTool = tool({
  description: "To'lovi kechikkan o'quvchilar ro'yxatini qaytaradi.",
  parameters: overdueParams,
  // @ts-expect-error - AI SDK TS inference bug with Zod schemas
  execute: async (args: z.infer<typeof overdueParams>) => {
    const supabase = createAdminClient();
    
    const [
      { data: students, error: err1 },
      { data: payments, error: err2 }
    ] = await Promise.all([
      supabase.from("students").select("id, first_name, last_name, phone").eq("status", "Faol"),
      supabase.from("payments").select("student_id, payment_date")
    ]);
      
    if (err1) return { error: err1.message };
    if (err2) return { error: err2.message };
    
    const today = new Date();
    const lastPayments = new Map<string, Date>();
    (payments || []).forEach(p => {
       const pDate = new Date(p.payment_date);
       const existing = lastPayments.get(p.student_id);
       if (!existing || pDate > existing) {
         lastPayments.set(p.student_id, pDate);
       }
    });

    const overdue = (students || []).filter(s => {
       const lastPay = lastPayments.get(s.id);
       if (!lastPay) return true;
       const diff = (today.getTime() - lastPay.getTime()) / (1000 * 3600 * 24);
       return diff > 30;
    }).map(s => {
       const last = lastPayments.get(s.id);
       const diff = last ? Math.floor((today.getTime() - last.getTime()) / (1000 * 3600 * 24)) - 30 : 30;
       return { name: `${s.first_name} ${s.last_name || ""}`.trim(), phone: s.phone, daysOverdue: diff };
    });
    
    return {
      totalOverdueStudents: overdue.length,
      students: overdue
    };
  },
});

const groupsParams = z.object({ _dummy: z.string().optional() });
export const getGroupsTool = tool({
  description: "Markazdagi barcha guruhlar ro'yxatini va ulardagi o'quvchilar sonini qaytaradi.",
  parameters: groupsParams,
  // @ts-expect-error - AI SDK TS inference bug with Zod schemas
  execute: async (args: z.infer<typeof groupsParams>) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, status, schedule, teacher_id");
      
    if (error) return { error: error.message };
    return { groups: data };
  },
});

export const agentTools = {
  getOverduePayments: getOverduePaymentsTool,
  getGroups: getGroupsTool,
};
