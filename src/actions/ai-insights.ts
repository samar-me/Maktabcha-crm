"use server";

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const google = createGoogleGenerativeAI({
  apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "",
});

const insightSchema = z.object({
  id: z.string(),
  type: z.enum(["payment", "attendance", "student-risk", "lesson", "curriculum", "crm-error", "finance", "recommendation"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  title: z.string(),
  description: z.string(),
});

export type AIInsight = z.infer<typeof insightSchema>;

export async function generateDashboardInsightsAction(): Promise<{ success: boolean; insights?: AIInsight[]; error?: string }> {
  try {
    const supabase = createAdminClient();
    
    // 1. Fetch raw data to feed to the AI
    const [
      { data: students },
      { data: groups },
      { data: payments },
    ] = await Promise.all([
      supabase.from("students").select("id, first_name, last_name, status").eq("status", "Faol"),
      supabase.from("groups").select("id, name, status").eq("status", "Faol"),
      supabase.from("payments").select("student_id, payment_date"),
    ]);

    const today = new Date();
    
    // Calculate last payment per student
    const lastPayments = new Map<string, Date>();
    (payments || []).forEach(p => {
       const pDate = new Date(p.payment_date);
       const existing = lastPayments.get(p.student_id);
       if (!existing || pDate > existing) {
         lastPayments.set(p.student_id, pDate);
       }
    });

    const overdueStudents = (students || []).filter(s => {
       const lastPay = lastPayments.get(s.id);
       if (!lastPay) return true; // Never paid
       const diff = (today.getTime() - lastPay.getTime()) / (1000 * 3600 * 24);
       return diff > 30;
    }).map(s => `${s.first_name} ${s.last_name}`);

    // Create a text summary of the current CRM state
    const crmState = `
    Active Students: ${students?.length || 0}
    Active Groups: ${groups?.length || 0}
    Students with overdue payments (>30 days): ${overdueStudents.length} (${overdueStudents.slice(0,3).join(", ")}...)
    `;

    const result = await generateObject({
      model: google("gemini-2.5-flash"), // fast model for insights
      system: `Sen o'quv markaz tahlilchisisan. Senga markazning joriy holati haqida qisqacha ma'lumot beriladi.
      Shu ma'lumotlarga asoslanib, eng muhim 3-4 ta xulosa (insight) yaratib ber.
      Faqat berilgan ma'lumotlardan foydalan. O'zbek tilida yoz.`,
      prompt: `Joriy holat: ${crmState}`,
      schema: z.object({
        insights: z.array(insightSchema),
      }),
    });

    return { success: true, insights: result.object.insights };
  } catch (error: any) {
    console.error("AI Insight generation error:", error);
    return { success: false, error: error.message };
  }
}
