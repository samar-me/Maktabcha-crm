import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { agentTools } from "@/lib/ai/agent-tools";

export const maxDuration = 60;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-1.5-pro-latest"), // or 1.5-pro, depending on API access. We will use gemini-1.5-pro as fallback if 2.5 is not available. Wait, 1.5-flash is faster and works well.
    system: `Sen Maktabcha CRM tizimining AI yordamchisisan. Sen o'quv markaz rahbarlari va o'qituvchilariga tizimdagi holatni tahlil qilishga yordam berasan.
    Foydalanuvchi bilan har doim o'zbek tilida, aniq, qisqa va do'stona gaplash.
    Senga berilgan asboblar (tools) yordamida o'quv markaz bazasidan real ma'lumotlarni ola bilasan. Hech qachon ma'lumot o'ylab topma.
    Agar ma'lumot yetarli bo'lmasa, "Buni aniqlash uchun CRM'da yetarli ma'lumot yo'q" deb ayt.`,
    messages,
    tools: agentTools,
  });

  return result.toTextStreamResponse();
}
