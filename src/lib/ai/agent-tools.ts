import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { AIContext, createPreview } from "./security";

const search = z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(50).default(10) });

export function createAgentTools(context: AIContext) {
  const db: any = createAdminClient();
  const org = context.organizationId;
  return {
    studentsSearch: tool({
      description: "O‘quvchini ism, familiya yoki telefon orqali qidiradi.", inputSchema: search,
      execute: async ({ query, limit }: z.infer<typeof search>) => {
        const safe = query.replace(/[%_,()]/g, "");
        const { data, error } = await (db.from("students") as any).select("id,first_name,last_name,phone,status,joined_at").eq("organization_id", org).or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,phone.ilike.%${safe}%`).limit(limit);
        return error ? { error: error.message } : { count: data?.length || 0, students: data || [] };
      },
    }),
    studentFullAnalysis: tool({
      description: "Bitta o‘quvchining guruh, davomat, baho, vazifa va to‘lovlari asosida faktik tahlilini qaytaradi.", inputSchema: z.object({ studentId: z.string().uuid() }),
      execute: async ({ studentId }: { studentId: string }) => {
        const { data: student } = await (db.from("students") as any).select("*").eq("organization_id", org).eq("id", studentId).single();
        if (!student) return { found: false };
        const [memberships, attendance, grades, submissions, payments] = await Promise.all([
          (db.from("group_students") as any).select("status,joined_at,groups(id,name,course_name,status)").eq("organization_id", org).eq("student_id", studentId),
          (db.from("attendance") as any).select("date,status").eq("organization_id", org).eq("student_id", studentId).order("date", { ascending: false }).limit(30),
          (db.from("grades") as any).select("date,title,score,max_score").eq("organization_id", org).eq("student_id", studentId).order("date", { ascending: false }).limit(30),
          (db.from("homework_submissions") as any).select("status,score,updated_at,homework(title,due_date)").eq("organization_id", org).eq("student_id", studentId).limit(30),
          (db.from("payments") as any).select("amount,payment_date,month,year,payment_method").eq("organization_id", org).eq("student_id", studentId).order("payment_date", { ascending: false }).limit(24),
        ]);
        const att = attendance.data || [], present = att.filter((x: any) => x.status === "Keldi" || x.status === "Kechikdi").length;
        const gs = grades.data || [], average = gs.length ? Math.round(gs.reduce((s: number, x: any) => s + Number(x.score) / Number(x.max_score) * 100, 0) / gs.length) : null;
        return { found: true, student, groups: memberships.data || [], attendance: { total: att.length, present, absent: att.length - present, rate: att.length ? Math.round(present / att.length * 100) : null, recent: att }, grades: { averagePercent: average, recent: gs }, homework: submissions.data || [], payments: payments.data || [], dataQuality: { enoughForRisk: att.length >= 4 || gs.length >= 2 } };
      },
    }),
    groupsSearch: tool({
      description: "Guruhlarni nomi yoki kursi bo‘yicha qidiradi.", inputSchema: search,
      execute: async ({ query, limit }: z.infer<typeof search>) => {
        const safe = query.replace(/[%_,()]/g, "");
        const { data, error } = await (db.from("groups") as any).select("id,name,course_name,teacher_name,monthly_fee,status,schedule").eq("organization_id", org).or(`name.ilike.%${safe}%,course_name.ilike.%${safe}%`).limit(limit);
        return error ? { error: error.message } : { count: data?.length || 0, groups: data || [] };
      },
    }),
    paymentIntelligence: tool({
      description: "Davr uchun tushum, kutilgan tushum, qarzdorlar va billing exceptionlarni hisoblaydi.", inputSchema: z.object({ month: z.number().int().min(1).max(12), year: z.number().int().min(2020).max(2100) }),
      execute: async ({ month, year }: { month: number; year: number }) => {
        const [payments, members, exceptions] = await Promise.all([
          (db.from("payments") as any).select("id,student_id,group_id,amount,payment_date,students(first_name,last_name)").eq("organization_id", org).eq("month", month).eq("year", year),
          (db.from("group_students") as any).select("student_id,group_id,groups(monthly_fee),students(first_name,last_name)").eq("organization_id", org).eq("status", "Faol"),
          (db.from("billing_exceptions") as any).select("*").eq("organization_id", org).eq("status", "active"),
        ]);
        const paid = new Map<string, number>(); for (const p of payments.data || []) paid.set(p.student_id, (paid.get(p.student_id) || 0) + Number(p.amount));
        const expected = (members.data || []).reduce((s: number, x: any) => s + Number(x.groups?.monthly_fee || 0), 0), collected = (payments.data || []).reduce((s: number, x: any) => s + Number(x.amount), 0);
        const debtors = (members.data || []).filter((x: any) => (paid.get(x.student_id) || 0) < Number(x.groups?.monthly_fee || 0)).map((x: any) => ({ studentId: x.student_id, name: `${x.students?.first_name || ""} ${x.students?.last_name || ""}`.trim(), due: Number(x.groups?.monthly_fee || 0) - (paid.get(x.student_id) || 0) }));
        return { period: { month, year }, expectedRevenue: expected, collectedRevenue: collected, outstanding: Math.max(0, expected - collected), debtors, billingExceptions: exceptions.data || [] };
      },
    }),
    crmAudit: tool({
      description: "CRM integrity auditini bajaradi: duplicate, bo‘sh telefon, orphan va invalid paymentlarni topadi.", inputSchema: z.object({}),
      execute: async () => {
        const [students, memberships, groups, payments] = await Promise.all([
          (db.from("students") as any).select("id,first_name,last_name,phone,status").eq("organization_id", org), (db.from("group_students") as any).select("id,student_id,group_id,status").eq("organization_id", org), (db.from("groups") as any).select("id,name,status").eq("organization_id", org), (db.from("payments") as any).select("id,student_id,group_id,amount,month,year").eq("organization_id", org),
        ]);
        const ss = students.data || [], ids = new Set(ss.map((x: any) => x.id)), gids = new Set((groups.data || []).map((x: any) => x.id)), seen = new Map<string, any[]>();
        for (const s of ss) { const k = `${s.first_name} ${s.last_name || ""}`.trim().toLowerCase(); seen.set(k, [...(seen.get(k) || []), s]); }
        return { checkedAt: new Date().toISOString(), issues: { duplicateStudents: [...seen.entries()].filter(([, v]) => v.length > 1).map(([name, rows]) => ({ name, ids: rows.map(x => x.id) })), missingPhones: ss.filter((x: any) => !x.phone), orphanMemberships: (memberships.data || []).filter((x: any) => !ids.has(x.student_id) || !gids.has(x.group_id)), invalidPayments: (payments.data || []).filter((x: any) => !ids.has(x.student_id) || !gids.has(x.group_id) || Number(x.amount) <= 0 || x.month < 1 || x.month > 12) } };
      },
    }),
    referralHistory: tool({
      description: "Studentning referral kodi, pending/successful takliflari va joriy referral chegirmasini ko‘rsatadi.", inputSchema: z.object({ studentId:z.string().uuid() }),
      execute: async ({studentId}:{studentId:string}) => { const [{data:student},{data:rows},{data:discounts}]=await Promise.all([db.from("students").select("id,first_name,last_name,referral_code").eq("organization_id",org).eq("id",studentId).single(),db.from("referrals").select("id,status,discount_percent,created_at,qualified_at,referred:students!referrals_referred_student_id_fkey(id,first_name,last_name,status)").eq("organization_id",org).eq("referrer_student_id",studentId).order("created_at",{ascending:false}),db.from("discounts").select("percent,active").eq("organization_id",org).eq("student_id",studentId).eq("type","referral").eq("active",true)]); if(!student)return{found:false};return{found:true,student,successful:(rows||[]).filter((r:any)=>["qualified","rewarded"].includes(r.status)).length,pending:(rows||[]).filter((r:any)=>r.status==="pending").length,currentReferralDiscount:Math.min(100,(discounts||[]).reduce((s:number,d:any)=>s+Number(d.percent||0),0)),history:rows||[]}; },
    }),
    referralLeaderboard: tool({
      description: "Eng ko‘p successful referral olib kelgan studentlar reytingini ko‘rsatadi.", inputSchema:z.object({limit:z.number().int().min(1).max(50).default(10)}),
      execute:async({limit}:{limit:number})=>{const{data}=await db.from("referrals").select("referrer_student_id,status,referrer:students!referrals_referrer_student_id_fkey(first_name,last_name)").eq("organization_id",org).in("status",["qualified","rewarded"]);const map=new Map<string,any>();for(const r of data||[]){const v=map.get(r.referrer_student_id)||{studentId:r.referrer_student_id,name:`${r.referrer?.first_name||""} ${r.referrer?.last_name||""}`.trim(),successful:0};v.successful++;map.set(r.referrer_student_id,v)}return{leaderboard:[...map.values()].sort((a,b)=>b.successful-a.successful).slice(0,limit)}}
    }),
    previewAttachReferral: tool({
      description:"Yangi studentni referrerga bog‘lash uchun preview yaratadi; mavjud bog‘lanishni overwrite qilmaydi.",inputSchema:z.object({referredStudentId:z.string().uuid(),referrerStudentId:z.string().uuid()}),
      execute:async(input:{referredStudentId:string;referrerStudentId:string})=>{if(input.referredStudentId===input.referrerStudentId)return{error:"Student o‘zini referral qila olmaydi"};const[{data:referred},{data:referrer},{data:existing},{data:cfg}]=await Promise.all([db.from("students").select("id,first_name,last_name,phone").eq("organization_id",org).eq("id",input.referredStudentId).single(),db.from("students").select("id,first_name,last_name,phone").eq("organization_id",org).eq("id",input.referrerStudentId).single(),db.from("referrals").select("id,status").eq("organization_id",org).eq("referred_student_id",input.referredStudentId).maybeSingle(),db.from("referral_settings").select("reward_percent,maximum_discount_percent").eq("organization_id",org).single()]);if(!referred||!referrer)return{error:"Student topilmadi"};if(existing)return{error:"Bu student allaqachon referrerga bog‘langan",existing};if(referred.phone&&referrer.phone&&referred.phone===referrer.phone)return{error:"Bir xil telefon raqami shubhali referral"};return createPreview(context,"referral.attach",2,input,{referred,referrer,status:"pending",rewardAfterQualification:`${cfg?.reward_percent||20}%`,note:"Reward faqat faol guruh va birinchi haqiqiy paymentdan keyin beriladi"})}
    }),
    previewCancelReferral: tool({
      description:"Referral va unga bog‘liq aktiv discountni bekor qilish oqibatlarini preview qiladi.",inputSchema:z.object({referralId:z.string().uuid(),reason:z.string().min(3)}),
      execute:async(input:{referralId:string;reason:string})=>{const{data:r}=await db.from("referrals").select("*,referrer:students!referrals_referrer_student_id_fkey(first_name,last_name),referred:students!referrals_referred_student_id_fkey(first_name,last_name)").eq("organization_id",org).eq("id",input.referralId).single();if(!r)return{error:"Referral topilmadi"};return createPreview(context,"referral.cancel",2,input,{referral:r,effects:["Referral cancelled bo‘ladi","Unga bog‘liq aktiv discount o‘chadi","Keyingi payment qayta hisoblanadi"]})}
    }),
    previewMoveStudent: tool({
      description: "Studentni boshqa guruhga ko‘chirish DRY RUN'i. Faqat preview va confirmation ID qaytaradi.", inputSchema: z.object({ studentId: z.string().uuid(), fromGroupId: z.string().uuid(), toGroupId: z.string().uuid() }),
      execute: async (input: { studentId: string; fromGroupId: string; toGroupId: string }) => {
        const [{ data: student }, { data: from }, { data: to }] = await Promise.all([(db.from("students") as any).select("id,first_name,last_name").eq("organization_id", org).eq("id", input.studentId).single(), (db.from("groups") as any).select("id,name,monthly_fee").eq("organization_id", org).eq("id", input.fromGroupId).single(), (db.from("groups") as any).select("id,name,monthly_fee").eq("organization_id", org).eq("id", input.toGroupId).single()]);
        if (!student || !from || !to) return { error: "Student yoki guruh topilmadi" };
        return createPreview(context, "students.moveGroup", 2, input, { student, change: { from, to }, effects: ["A’zolik yangilanadi", "Yangi tarif keyingi billing davridan qo‘llanadi"] });
      },
    }),
    previewBillingException: tool({
      description: "Vaqtinchalik tekin/chegirmali o‘qish qoidasini DRY RUN qiladi.", inputSchema: z.object({ studentId: z.string().uuid(), groupId: z.string().uuid().optional(), startsOn: z.string(), endsOn: z.string(), discountPercentage: z.number().min(0).max(100).default(100), displayAsPaid: z.boolean().default(true), includeInRevenue: z.boolean().default(false), suppressDebtNotifications: z.boolean().default(true), reason: z.string().min(3) }),
      execute: async (input: any) => { const { data: student } = await (db.from("students") as any).select("id,first_name,last_name,status").eq("organization_id", org).eq("id", input.studentId).single(); if (!student) return { error: "Student topilmadi" }; return createPreview(context, "billing.createException", 2, input, { student, period: `${input.startsOn} — ${input.endsOn}`, ...input, restorePreviousTariff: true }); },
    }),
  };
}
