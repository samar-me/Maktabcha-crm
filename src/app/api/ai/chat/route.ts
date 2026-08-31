import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, stepCountIs } from "ai";
import { createAgentTools } from "@/lib/ai/agent-tools";
import { requireAIContext } from "@/lib/ai/security";

export const maxDuration = 60;

const google = createGoogleGenerativeAI({
  apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "",
});

export async function POST(req: Request) {
  let context;
  try { context = await requireAIContext(); }
  catch { return new Response("Avtorizatsiya talab qilinadi", { status: 401 }); }
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-3.6-flash"),
    system: `Sen Maktabcha Super Admin AI agentsan. Tiling o‘zbekcha, javobing qisqa, aniq va amaliy.
Understand → Inspect → Plan → Validate → Preview → Confirm → Execute → Verify → Log tartibida ishlaysan.
Faqat tool qaytargan real CRM faktlarini ayt. Yetarli dalil bo‘lmasa aynan: "Buni aniqlash uchun tizimda yetarli ma’lumot mavjud emas." de.
Avval nom bo‘yicha qidir, bir nechta mos natija bo‘lsa foydalanuvchidan aniqlashtir. ID o‘ylab topma.
Write actionlarni hech qachon bevosita bajarilgan deb aytma. Preview tool confirmationId qaytarsa oqibatlarni ko‘rsat va oxirida alohida [CONFIRM:<confirmationId>] yoz. UI shu marker orqali Apply Changes tugmasini chiqaradi.
Risk 2+ action tasdiqsiz bajarilmaydi. Parol, token, hash, service key yoki environment secretni so‘rama va ko‘rsatma.
Risk tahlilida dataQuality yetarli bo‘lmasa risk darajasini o‘ylab topma. Organization chegarasidan tashqariga chiqma. Hozirgi rol: ${context.role}.`,
    messages,
    tools: createAgentTools(context),
    stopWhen: stepCountIs(8),
  });

  return result.toTextStreamResponse();
}
