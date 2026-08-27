"use server";

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const google = createGoogleGenerativeAI({
  apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "",
});

export async function generateLessonPlanAction(groupId: string) {
  try {
    const supabase = createAdminClient();
    
    // 1. Fetch group info
    const { data: group } = await supabase.from("groups").select("*").eq("id", groupId).single();
    if (!group) throw new Error("Guruh topilmadi");

    // 2. Fetch past lessons to know what was taught
    const { data: pastLessons } = await supabase
      .from("lessons")
      .select("topic, date")
      .eq("group_id", groupId)
      .lte("date", new Date().toISOString())
      .order("date", { ascending: false })
      .limit(3);

    // 3. Fetch future lessons to know what's next
    const { data: futureLessons } = await supabase
      .from("lessons")
      .select("topic, date")
      .eq("group_id", groupId)
      .gt("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(3);
      
    // 4. Fetch curriculum if available
    const { data: curriculumPlan } = await supabase
      .from("curricula")
      .select("id")
      .eq("group_id", groupId)
      .single();
      
    let curriculumItems: any[] = [];
    if (curriculumPlan) {
        const { data: items } = await (supabase.from("curriculum_items") as any)
          .select("title, description, order_number")
          .eq("curriculum_id", curriculumPlan.id)
          .order("order_number", { ascending: true });
        curriculumItems = items || [];
    }

    const context = `
    Guruh nomi: ${group.name}
    Oxirgi o'tilgan mavzular: ${pastLessons?.map(l => l.topic).join(", ") || "Yo'q"}
    Keyingi kutilayotgan mavzular: ${futureLessons?.map(l => l.topic).join(", ") || "Yo'q"}
    O'quv dasturi (Curriculum): ${curriculumItems.map((i: any) => i.title).join(" -> ")}
    `;

    const result = await generateObject({
      model: google("gemini-3.6-flash"),
      system: `Sen professional o'qituvchisan. Senga guruhning oxirgi o'tgan mavzulari va rejadagi mavzular beriladi. 
      Vazifang: Ertangi dars uchun batafsil dars rejasini (Lesson Plan) yaratish.
      O'zbek tilida yozing. Vaqtlarni mantiqan taqsimlang (umumiy 90 daqiqa).`,
      prompt: `Guruh holati: ${context}\n\nIltimos, keyingi (ertangi) dars uchun rejani tuzing.`,
      schema: z.object({
        topic: z.string().describe("Dars mavzusi"),
        duration: z.number().describe("Dars davomiyligi (daqiqa)"),
        breakdown: z.array(z.object({
          minutes: z.number(),
          activity: z.string(),
        })).describe("Vaqt taqsimoti"),
        teacherPrep: z.array(z.string()).describe("Darsdan oldin o'qituvchi tayyorgarlik ko'rishi / e'tibor berishi kerak bo'lgan narsalar"),
        knowledgeGaps: z.array(z.string()).describe("O'quvchilar qiynalishi mumkin bo'lgan oldingi mavzular (agar bo'lsa)")
      }),
    });

    return { success: true, plan: result.object };
  } catch (error: any) {
    console.error("Lesson plan error:", error);
    return { success: false, error: error.message };
  }
}
