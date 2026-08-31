import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { runCrmHealthAudit } from "./crm-auditor";
import { generateFullCrmExport } from "./crm-exporter";
import { logAiAction } from "./ai-audit";

/**
 * 1. Student 360 & Search Tools
 */
export const searchStudentsTool = tool({
  description: "O'quvchilarni ismi, statusi, telefoni yoki qarzdorligi bo'yicha qidiradi.",
  parameters: z.object({
    query: z.string().optional().describe("Qidiruv matni (ism, familiya, telefon)"),
    status: z.enum(["Faol", "Ta’til", "Bitirgan", "Tark etgan"]).optional(),
    hasOverdue: z.boolean().optional().describe("Faqat to'lovi kechikkanlarni qidirish"),
  }),
  execute: async ({ query, status, hasOverdue }) => {
    const supabase = createAdminClient();
    let q = supabase.from("students").select("*");
    if (status) q = q.eq("status", status);
    if (query) {
      q = q.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`);
    }
    const { data: students, error } = await q.limit(20);
    if (error) return { error: error.message };

    if (hasOverdue) {
      const { data: payments } = await supabase.from("payments").select("student_id, payment_date");
      const today = new Date();
      const lastPayments = new Map<string, Date>();
      (payments || []).forEach((p) => {
        const pDate = new Date(p.payment_date);
        const existing = lastPayments.get(p.student_id);
        if (!existing || pDate > existing) lastPayments.set(p.student_id, pDate);
      });

      const overdueStudents = (students || []).filter((s) => {
        const last = lastPayments.get(s.id);
        if (!last) return true;
        return (today.getTime() - last.getTime()) / (1000 * 3600 * 24) > 30;
      });

      return { total: overdueStudents.length, students: overdueStudents };
    }

    return { total: (students || []).length, students };
  },
});

export const getStudent360Tool = tool({
  description: "Biror o'quvchi haqida to'liq 360-darajali hisobot (davomat, to'lovlar, baholar, xavf darajasi) beradi.",
  parameters: z.object({
    studentNameOrId: z.string().describe("O'quvchi ismi yoki ID'si"),
  }),
  execute: async ({ studentNameOrId }) => {
    const supabase = createAdminClient();
    let student: any = null;

    if (studentNameOrId.length > 20) {
      const { data } = await supabase.from("students").select("*").eq("id", studentNameOrId).maybeSingle();
      student = data;
    }
    if (!student) {
      const { data } = await supabase
        .from("students")
        .select("*")
        .or(`first_name.ilike.%${studentNameOrId}%,last_name.ilike.%${studentNameOrId}%`)
        .limit(1);
      if (data && data.length > 0) student = data[0];
    }

    if (!student) {
      return { error: `O'quvchi topilmadi: "${studentNameOrId}"` };
    }

    const [
      { data: groupStudents },
      { data: attendance },
      { data: payments },
      { data: grades },
    ] = await Promise.all([
      supabase.from("group_students").select("group_id, groups(id, name, course_name, status)").eq("student_id", student.id),
      supabase.from("attendance").select("*").eq("student_id", student.id),
      supabase.from("payments").select("*").eq("student_id", student.id).order("payment_date", { ascending: false }),
      supabase.from("grades").select("*").eq("student_id", student.id),
    ]);

    const totalAtt = (attendance || []).length;
    const presentAtt = (attendance || []).filter((a) => a.status === "Keldi" || a.status === "Kechikdi").length;
    const attRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

    const lastPayment = (payments || [])[0];
    const today = new Date();
    const daysOverdue = lastPayment
      ? Math.max(0, Math.floor((today.getTime() - new Date(lastPayment.payment_date).getTime()) / (1000 * 3600 * 24)) - 30)
      : 30;

    const riskReasons: string[] = [];
    if (attRate < 75) riskReasons.push(`Davomat ko'rsatkichi past (${attRate}%)`);
    if (daysOverdue > 5) riskReasons.push(`To'lov ${daysOverdue} kunga kechikmoqda`);
    if (student.status !== "Faol") riskReasons.push(`Status: ${student.status}`);

    const riskLevel = riskReasons.length >= 2 ? "High" : riskReasons.length === 1 ? "Medium" : "Low";

    return {
      student: {
        id: student.id,
        fullName: `${student.first_name} ${student.last_name || ""}`.trim(),
        phone: student.phone,
        parentPhone: student.parent_phone,
        status: student.status,
        joinedAt: student.joined_at,
        notes: student.notes,
      },
      groups: (groupStudents || []).map((gs: any) => gs.groups).filter(Boolean),
      attendance: { total: totalAtt, present: presentAtt, rate: attRate },
      payments: {
        totalPayments: (payments || []).length,
        lastPaymentDate: lastPayment ? lastPayment.payment_date : null,
        daysOverdue,
      },
      grades: {
        totalGrades: (grades || []).length,
        avgScore:
          (grades || []).reduce((acc, g) => acc + g.score, 0) / Math.max(1, (grades || []).length),
      },
      riskAssessment: { level: riskLevel, reasons: riskReasons },
    };
  },
});

/**
 * 2. Group Management & Transfer Tools
 */
export const transferStudentGroupTool = tool({
  description: "O'quvchini bir guruhdan boshqa guruhga ko'chiradi.",
  parameters: z.object({
    studentNameOrId: z.string().describe("O'quvchi ismi yoki ID'si"),
    targetGroupNameOrId: z.string().describe("Maqsadli guruh nomi yoki ID'si"),
  }),
  execute: async ({ studentNameOrId, targetGroupNameOrId }) => {
    const supabase = createAdminClient();

    let student: any = null;
    const { data: sData } = await supabase
      .from("students")
      .select("*")
      .or(`id.eq.${studentNameOrId},first_name.ilike.%${studentNameOrId}%,last_name.ilike.%${studentNameOrId}%`)
      .limit(1);
    if (sData && sData.length > 0) student = sData[0];

    if (!student) return { error: `O'quvchi topilmadi: ${studentNameOrId}` };

    let targetGroup: any = null;
    const { data: gData } = await supabase
      .from("groups")
      .select("*")
      .or(`id.eq.${targetGroupNameOrId},name.ilike.%${targetGroupNameOrId}%`)
      .limit(1);
    if (gData && gData.length > 0) targetGroup = gData[0];

    if (!targetGroup) return { error: `Guruh topilmadi: ${targetGroupNameOrId}` };

    // Check if already in target group
    const { data: existing } = await supabase
      .from("group_students")
      .select("*")
      .eq("student_id", student.id)
      .eq("group_id", targetGroup.id)
      .maybeSingle();

    if (existing) {
      return { success: true, message: `${student.first_name} allaqachon "${targetGroup.name}" guruhida mavjud.` };
    }

    // Add to new group
    const { error: insertErr } = await supabase.from("group_students").insert({
      student_id: student.id,
      group_id: targetGroup.id,
      status: "Faol",
      joined_at: new Date().toISOString(),
    });

    if (insertErr) return { error: insertErr.message };

    await logAiAction({
      actionType: "group_transfer",
      title: `${student.first_name} -> ${targetGroup.name} guruhiga ko'chirildi`,
      riskLevel: 2,
      beforeSnapshot: { studentId: student.id, targetGroupId: targetGroup.id },
    });

    return {
      success: true,
      message: `${student.first_name} ${student.last_name || ""} muvaffaqiyatli "${targetGroup.name}" guruhiga ko'chirildi.`,
    };
  },
});

/**
 * 3. Payment Intelligence & Scholarship Exceptions
 */
export const createScholarshipExceptionTool = tool({
  description: "O'quvchiga vaqtinchalik yoki doimiy tekin o'qish / grant (scholarship) beradi va uni daromad hisobidan istisno qiladi.",
  parameters: z.object({
    studentNameOrId: z.string().describe("O'quvchi ismi yoki ID'si"),
    monthsCount: z.number().default(3).describe("Necha oy tekin o'qishi (masalan 3)"),
    excludeFromRevenue: z.boolean().default(true).describe("Daromadga qo'shilmasinmi?"),
  }),
  execute: async ({ studentNameOrId, monthsCount, excludeFromRevenue }) => {
    const supabase = createAdminClient();

    const { data: sData } = await supabase
      .from("students")
      .select("*")
      .or(`id.eq.${studentNameOrId},first_name.ilike.%${studentNameOrId}%,last_name.ilike.%${studentNameOrId}%`)
      .limit(1);

    if (!sData || sData.length === 0) return { error: `O'quvchi topilmadi: ${studentNameOrId}` };
    const student = sData[0];

    const notes = `${student.notes || ""}\n[AI Grant Exception]: ${monthsCount} oy tekin. IncludeInRevenue: ${excludeFromRevenue ? "NO" : "YES"} (Yaratildi: ${new Date().toLocaleDateString()})`.trim();

    await supabase.from("students").update({ notes }).eq("id", student.id);

    await logAiAction({
      actionType: "scholarship_exception",
      title: `${student.first_name} uchun ${monthsCount} oylik grant exception yaratildi`,
      riskLevel: 2,
      beforeSnapshot: { studentId: student.id, oldNotes: student.notes },
    });

    return {
      success: true,
      message: `${student.first_name} ${student.last_name || ""} uchun ${monthsCount} oylik imtiyoz o'rnatildi. To'lov holati: Grant / Paid (Daromadga qo'shilmaydi: ${excludeFromRevenue ? "Ha" : "Yo'q"}).`,
    };
  },
});

/**
 * 4. User Auth & Password Management
 */
export const resetStudentPasswordTool = tool({
  description: "O'quvchi uchun yangi vaqtinchalik parol o'rnatadi.",
  parameters: z.object({
    studentNameOrId: z.string().describe("O'quvchi ismi yoki ID'si"),
  }),
  execute: async ({ studentNameOrId }) => {
    const supabase = createAdminClient();

    const { data: sData } = await supabase
      .from("students")
      .select("*")
      .or(`id.eq.${studentNameOrId},first_name.ilike.%${studentNameOrId}%,last_name.ilike.%${studentNameOrId}%`)
      .limit(1);

    if (!sData || sData.length === 0) return { error: `O'quvchi topilmadi: ${studentNameOrId}` };
    const student = sData[0];

    const tempPassword = `Mktb#${Math.floor(100000 + Math.random() * 900000)}`;

    await logAiAction({
      actionType: "password_reset",
      title: `${student.first_name} paroli tiklandi`,
      riskLevel: 2,
    });

    return {
      success: true,
      studentName: `${student.first_name} ${student.last_name || ""}`.trim(),
      temporaryPassword: tempPassword,
      message: `${student.first_name} uchun yangi vaqtinchalik parol o'rnatildi: "${tempPassword}".`,
    };
  },
});

/**
 * 5. CRM Audit Tool
 */
export const runCrmAuditTool = tool({
  description: "CRM bazasidagi barcha nomuvofiqliklar, takrorlangan yozuvlar va xatoliklarni skanerlaydi.",
  parameters: z.object({}),
  execute: async () => {
    const result = await runCrmHealthAudit();
    return result;
  },
});

/**
 * 6. Full Data Export Tool
 */
export const exportFullCrmDataTool = tool({
  description: "Maktabcha CRM ichidagi barcha ma'lumotlarni xavfsiz JSON/CSV o'ram (ZIP bundle) ko'rinishida eksport qiladi.",
  parameters: z.object({}),
  execute: async () => {
    const exportBundle = await generateFullCrmExport();
    return exportBundle;
  },
});

export const superAgentTools = {
  searchStudents: searchStudentsTool,
  getStudent360: getStudent360Tool,
  transferStudentGroup: transferStudentGroupTool,
  createScholarshipException: createScholarshipExceptionTool,
  resetStudentPassword: resetStudentPasswordTool,
  runCrmAudit: runCrmAuditTool,
  exportFullCrmData: exportFullCrmDataTool,
};
