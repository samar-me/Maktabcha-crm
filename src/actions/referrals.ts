"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAIContext } from "@/lib/ai/security";
import { z } from "zod";

const uuidSchema = z.string().uuid("Student ID noto‘g‘ri");
const referralCodeSchema = z.string().trim().min(4).max(32).regex(/^[A-Za-z0-9-]+$/, "Taklif kodi formati noto‘g‘ri");
const createReferralSchema = z.object({ referrerStudentId: uuidSchema, referredStudentId: uuidSchema }).refine((v) => v.referrerStudentId !== v.referredStudentId, "Student o‘zini referral qila olmaydi");

export async function attachReferralByCodeAction(referredStudentId: string, code: string) {
  try {
    const parsed = z.object({ referredStudentId: uuidSchema, code: referralCodeSchema }).parse({ referredStudentId, code });
    referredStudentId = parsed.referredStudentId; code = parsed.code;
    const ctx = await requireAIContext(); const db: any = createAdminClient();
    const normalized = code.trim().toUpperCase(); if (!normalized) return { success: true };
    const { data: referred } = await db.from("students").select("id,phone,parent_phone").eq("organization_id",ctx.organizationId).eq("id",referredStudentId).single();
    const { data: referrer } = await db.from("students").select("id,first_name,last_name,phone,parent_phone").eq("organization_id",ctx.organizationId).eq("referral_code",normalized).single();
    if (!referred || !referrer) return { success:false,error:"Taklif kodi topilmadi" };
    if (referred.id===referrer.id) return { success:false,error:"Student o‘zini referral qila olmaydi" };
    if (referred.phone && referrer.phone && referred.phone===referrer.phone) return { success:false,error:"Bir xil telefon raqami referral sifatida qabul qilinmaydi" };
    const { data: existing } = await db.from("referrals").select("id").eq("organization_id",ctx.organizationId).eq("referred_student_id",referredStudentId).maybeSingle();
    if (existing) return { success:false,error:"Bu student allaqachon referrerga biriktirilgan" };
    const { data,error } = await db.from("referrals").insert({organization_id:ctx.organizationId,referrer_student_id:referrer.id,referred_student_id:referredStudentId,status:"pending"}).select().single();
    if(error) throw error; revalidatePath(`/students/${referredStudentId}`); revalidatePath("/dashboard");
    return {success:true,data,referrerName:`${referrer.first_name} ${referrer.last_name||""}`.trim()};
  } catch(e:any){return {success:false,error:e.message||"Referral yaratilmadi"};}
}

export async function createReferralAdminAction(referrerStudentId:string,referredStudentId:string){try{const input=createReferralSchema.parse({referrerStudentId,referredStudentId});referrerStudentId=input.referrerStudentId;referredStudentId=input.referredStudentId;const ctx=await requireAIContext();if(ctx.role!=="admin")return{success:false,error:"Faqat admin referral qo‘sha oladi"};const db:any=createAdminClient();const[{data:referrer},{data:referred},{data:existing}]=await Promise.all([db.from("students").select("id,first_name,last_name,phone,parent_phone,status").eq("organization_id",ctx.organizationId).eq("id",referrerStudentId).single(),db.from("students").select("id,first_name,last_name,phone,parent_phone,status").eq("organization_id",ctx.organizationId).eq("id",referredStudentId).single(),db.from("referrals").select("id,status").eq("organization_id",ctx.organizationId).eq("referred_student_id",referredStudentId).maybeSingle()]);if(!referrer||!referred)return{success:false,error:"Student topilmadi"};if(referrer.status!=="Faol"||referred.status!=="Faol")return{success:false,error:"Faqat faol studentlar referralga biriktiriladi"};if(existing)return{success:false,error:"Bu student allaqachon boshqa referrerga biriktirilgan"};if(referrer.phone&&referred.phone&&referrer.phone===referred.phone)return{success:false,error:"Bir xil telefon raqami bilan referral yaratib bo‘lmaydi"};const{data,error}=await db.from("referrals").insert({organization_id:ctx.organizationId,referrer_student_id:referrerStudentId,referred_student_id:referredStudentId,status:"pending"}).select().single();if(error)throw error;revalidatePath("/referrals");revalidatePath(`/students/${referrerStudentId}`);return{success:true,data,message:`${referred.first_name} → ${referrer.first_name} referral sifatida bog‘landi`}}catch(e:any){return{success:false,error:e.message||"Referral yaratilmadi"}}}

export async function getReferralStudentOptionsAction(){try{const ctx=await requireAIContext();const db:any=createAdminClient();const{data,error}=await db.from("students").select("id,first_name,last_name,phone,referral_code,status").eq("organization_id",ctx.organizationId).order("first_name");if(error)throw error;return{success:true,data:data||[]}}catch(e:any){return{success:false,error:e.message}}}

export async function getReferralSummaryAction(studentId: string) {
  try { const ctx=await requireAIContext(); const db:any=createAdminClient();
    const [{data:student},{data:outgoing},{data:incoming},{data:discounts}] = await Promise.all([
      db.from("students").select("id,referral_code").eq("organization_id",ctx.organizationId).eq("id",studentId).single(),
      db.from("referrals").select("id,status,discount_percent,created_at,qualified_at,referred:students!referrals_referred_student_id_fkey(id,first_name,last_name,status)").eq("organization_id",ctx.organizationId).eq("referrer_student_id",studentId).order("created_at",{ascending:false}),
      db.from("referrals").select("id,status,referrer:students!referrals_referrer_student_id_fkey(id,first_name,last_name)").eq("organization_id",ctx.organizationId).eq("referred_student_id",studentId).maybeSingle(),
      db.from("discounts").select("percent,amount,type,active").eq("organization_id",ctx.organizationId).eq("student_id",studentId).eq("active",true),
    ]);
    const rows=outgoing||[], successful=rows.filter((r:any)=>r.status==="qualified"||r.status==="rewarded").length, pending=rows.filter((r:any)=>r.status==="pending").length;
    const currentDiscount=Math.min(100,(discounts||[]).reduce((s:number,d:any)=>s+Number(d.percent||0),0));
    return {success:true,data:{referralCode:student?.referral_code,successful,pending,currentDiscount,outgoing:rows,referredBy:incoming||null}};
  } catch(e:any){return {success:false,error:e.message}; }
}

export async function getReferralLeaderboardAction(limit=10){
  try {const ctx=await requireAIContext();const db:any=createAdminClient();const {data,error}=await db.from("referrals").select("referrer_student_id,status,referrer:students!referrals_referrer_student_id_fkey(first_name,last_name)").eq("organization_id",ctx.organizationId).in("status",["qualified","rewarded"]);if(error)throw error;
    const map=new Map<string,any>();for(const r of data||[]){const v=map.get(r.referrer_student_id)||{studentId:r.referrer_student_id,name:`${r.referrer?.first_name||""} ${r.referrer?.last_name||""}`.trim(),count:0};v.count++;map.set(r.referrer_student_id,v);}return {success:true,data:[...map.values()].sort((a,b)=>b.count-a.count).slice(0,limit)};
  }catch(e:any){return {success:false,error:e.message};}
}

export async function cancelReferralAction(referralId:string,reason:string){
  try{const ctx=await requireAIContext();if(ctx.role!=="admin")return{success:false,error:"Faqat admin referralni bekor qila oladi"};const db:any=createAdminClient();const {data:r}=await db.from("referrals").select("*").eq("organization_id",ctx.organizationId).eq("id",referralId).single();if(!r)return{success:false,error:"Referral topilmadi"};
    await db.from("referrals").update({status:"cancelled",cancelled_at:new Date().toISOString(),cancellation_reason:reason.trim()||"Admin tomonidan bekor qilindi"}).eq("organization_id",ctx.organizationId).eq("id",r.id);await db.from("discounts").update({active:false}).eq("organization_id",ctx.organizationId).eq("referral_id",r.id);revalidatePath("/referrals");revalidatePath("/dashboard");return{success:true};
  }catch(e:any){return{success:false,error:e.message};}
}

export async function getReferralSettingsAction(){try{const ctx=await requireAIContext();const db:any=createAdminClient();const{data,error}=await db.from("referral_settings").select("*").eq("organization_id",ctx.organizationId).single();if(error)throw error;return{success:true,data};}catch(e:any){return{success:false,error:e.message};}}
export async function updateReferralSettingsAction(input:{enabled:boolean;reward_percent:number;maximum_discount_percent:number;qualification_rule:string;reward_duration:string;reward_months:number;allow_stacking:boolean}){try{const ctx=await requireAIContext();if(ctx.role!=="admin")return{success:false,error:"Faqat admin sozlay oladi"};const db:any=createAdminClient();const reward=Math.max(1,Math.min(100,Number(input.reward_percent))),maximum=Math.max(reward,Math.min(100,Number(input.maximum_discount_percent)));const{data,error}=await db.from("referral_settings").upsert({organization_id:ctx.organizationId,...input,reward_percent:reward,maximum_discount_percent:maximum,updated_at:new Date().toISOString()}).select().single();if(error)throw error;revalidatePath("/settings");return{success:true,data};}catch(e:any){return{success:false,error:e.message};}}
export async function getReferralDashboardAction(){try{const ctx=await requireAIContext();const db:any=createAdminClient();const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1).toISOString();const[{data:refs},{data:payments}]=await Promise.all([db.from("referrals").select("id,status,discount_percent,referred_student_id,created_at").eq("organization_id",ctx.organizationId).gte("created_at",start),db.from("payments").select("student_id,base_amount,final_amount,discount_amount,discount_type,include_in_revenue").eq("organization_id",ctx.organizationId).gte("payment_date",start.slice(0,10))]);const referralIds=new Set((refs||[]).map((r:any)=>r.referred_student_id));return{success:true,data:{total:(refs||[]).length,qualified:(refs||[]).filter((r:any)=>["qualified","rewarded"].includes(r.status)).length,pending:(refs||[]).filter((r:any)=>r.status==="pending").length,revenue:(payments||[]).filter((p:any)=>referralIds.has(p.student_id)&&p.include_in_revenue).reduce((s:number,p:any)=>s+Number(p.final_amount??p.base_amount??0),0),discount:(payments||[]).filter((p:any)=>p.discount_type==="referral").reduce((s:number,p:any)=>s+Number(p.discount_amount||0),0)}}}catch(e:any){return{success:false,error:e.message}}}

export async function getReferralAdminOverviewAction(){try{const ctx=await requireAIContext();const db:any=createAdminClient();const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1).toISOString();const[{data:refs,error},{data:payments}]=await Promise.all([db.from("referrals").select("id,status,discount_percent,created_at,qualified_at,referrer:students!referrals_referrer_student_id_fkey(id,first_name,last_name,referral_code),referred:students!referrals_referred_student_id_fkey(id,first_name,last_name,status,phone)").eq("organization_id",ctx.organizationId).order("created_at",{ascending:false}),db.from("payments").select("student_id,final_amount,amount,discount_amount,discount_type,include_in_revenue,payment_date").eq("organization_id",ctx.organizationId).gte("payment_date",start.slice(0,10))]);if(error)throw error;const rows=refs||[],monthRows=rows.filter((r:any)=>r.created_at>=start),referredIds=new Set(monthRows.map((r:any)=>r.referred?.id));const map=new Map<string,any>();for(const r of rows.filter((x:any)=>["qualified","rewarded"].includes(x.status))){const id=r.referrer?.id;if(!id)continue;const v=map.get(id)||{studentId:id,name:`${r.referrer.first_name} ${r.referrer.last_name||""}`.trim(),code:r.referrer.referral_code,count:0};v.count++;map.set(id,v)}return{success:true,data:{metrics:{monthTotal:monthRows.length,qualified:monthRows.filter((r:any)=>["qualified","rewarded"].includes(r.status)).length,pending:monthRows.filter((r:any)=>r.status==="pending").length,revenue:(payments||[]).filter((p:any)=>referredIds.has(p.student_id)&&p.include_in_revenue).reduce((s:number,p:any)=>s+Number(p.final_amount??p.amount??0),0),discount:(payments||[]).filter((p:any)=>p.discount_type==="referral").reduce((s:number,p:any)=>s+Number(p.discount_amount||0),0)},referrals:rows,leaderboard:[...map.values()].sort((a,b)=>b.count-a.count).slice(0,10)}}}catch(e:any){return{success:false,error:e.message}}}
