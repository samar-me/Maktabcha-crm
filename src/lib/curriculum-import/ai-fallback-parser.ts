import { callAIProvider } from "@/lib/ai/provider";
import { CurriculumImportRow } from "./types";

/**
 * Resiliently normalize any AI JSON output shape (objects, arrays, uzbek keys, english keys)
 */
function normalizeAIResponse(rawParsed: any): {
  courseTitle?: string;
  courseDescription?: string;
  items: CurriculumImportRow[];
} {
  const courseTitle =
    rawParsed?.courseTitle ||
    rawParsed?.title ||
    rawParsed?.kurs_nomi ||
    rawParsed?.kursNomi ||
    undefined;

  const courseDescription =
    rawParsed?.courseDescription ||
    rawParsed?.description ||
    rawParsed?.tavsif ||
    rawParsed?.kurs_tavsifi ||
    undefined;

  let rawList: any[] = [];
  if (Array.isArray(rawParsed)) {
    rawList = rawParsed;
  } else if (Array.isArray(rawParsed?.items)) {
    rawList = rawParsed.items;
  } else if (Array.isArray(rawParsed?.lessons)) {
    rawList = rawParsed.lessons;
  } else if (Array.isArray(rawParsed?.darslar)) {
    rawList = rawParsed.darslar;
  } else if (Array.isArray(rawParsed?.curriculum)) {
    rawList = rawParsed.curriculum;
  } else if (Array.isArray(rawParsed?.topics)) {
    rawList = rawParsed.topics;
  } else if (Array.isArray(rawParsed?.plan)) {
    rawList = rawParsed.plan;
  } else if (Array.isArray(rawParsed?.mavzular)) {
    rawList = rawParsed.mavzular;
  }

  const items: CurriculumImportRow[] = [];
  for (let i = 0; i < rawList.length; i++) {
    const r = rawList[i];
    if (!r) continue;

    const title = (
      r.title ||
      r.nomi ||
      r.name ||
      r.mavzu ||
      r.dars ||
      r.lesson ||
      r.topic ||
      (typeof r === "string" ? r : "") ||
      ""
    )
      .toString()
      .trim();

    if (!title) continue;

    const orderNumber =
      Number(r.orderNumber || r.order || r.tartib_raqami || r.raqami || r.num || i + 1) ||
      i + 1;

    items.push({
      orderNumber,
      title,
      description: (r.description || r.tavsifi || r.mazmuni || r.tavsif || "")
        .toString()
        .trim(),
      objective: (r.objective || r.maqsadi || r.maqsad || "")
        .toString()
        .trim(),
      practice: (r.practice || r.amaliyoti || r.amaliyot || r.mashgulot || "")
        .toString()
        .trim(),
      homeworkPlan: (r.homeworkPlan || r.homework || r.uyga_vazifa || r.vazifa || "")
        .toString()
        .trim(),
      durationMinutes:
        Number(r.durationMinutes || r.duration || r.davomiyligi || 90) || 90,
      category: (r.category || r.modul || r.bolim || r.section || "")
        .toString()
        .trim(),
    });
  }

  return {
    courseTitle: courseTitle ? String(courseTitle).trim() : undefined,
    courseDescription: courseDescription ? String(courseDescription).trim() : undefined,
    items,
  };
}

/**
 * AI-Assisted Structure Extraction for messy text / pasted syllabus
 */
export async function parseCurriculumWithAI(
  documentText: string
): Promise<{
  courseTitle?: string;
  courseDescription?: string;
  items: CurriculumImportRow[];
}> {
  if (!documentText || documentText.trim().length === 0) {
    throw new Error("Tahlil qilish uchun matn topilmadi.");
  }

  const trimmedText = documentText.slice(0, 40000);

  const systemPrompt = `Siz professional ta'lim metodisti va o'quv dasturlari (curriculum) bo'yicha mutaxassis AI yordamchisiz.
Sizga o'quv markazi yoki maktabning dars ish rejasi / o'quv dasturi matni beriladi.

SIZNING VAZIFANGIZ:
Ushbu matnni to'liq tahlil qilib, dars mavzulari va rejasini quyidagi JSON formatida qaytarish:
{
  "courseTitle": "Kurs nomi (masalan: Frontend Dasturlash)",
  "courseDescription": "Kurs haqida qisqacha tavsif",
  "items": [
    {
      "orderNumber": 1,
      "title": "Mavzu nomi (aniq va tushunarli)",
      "description": "Darsning asosiy mazmuni va nazariyasi",
      "objective": "Dars maqsadi",
      "practice": "Amaliy natija / mashg'ulot",
      "homeworkPlan": "Uyga vazifa rejasi",
      "durationMinutes": 90,
      "category": "Modul yoki bo'lim nomi"
    }
  ]
}

QOIDALAR:
1. FAQAT yaroqli JSON qaytaring. Markdown bloklari (\`\`\`json ...) ichiga oling.
2. Har bir dars mavzusi ("title") aniq bo'lishi shart.
3. Hujjatdagi BARCHA darslarni bitta ham qoldirmay chiqaring.
4. Tartib raqami (orderNumber) 1 dan boshlab ketma-ket ketsin.`;

  const userPrompt = `Quyidagi o'quv dasturi matnini tahlil qilib, darslar ro'yxatini JSON shakliga keltiring:\n\n${trimmedText}`;

  const response = await callAIProvider({
    systemPrompt,
    userPrompt,
    jsonMode: true,
  });

  let jsonStr = response.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const rawParsed = JSON.parse(jsonStr);
    const normalized = normalizeAIResponse(rawParsed);

    if (normalized.items.length === 0) {
      throw new Error("AI dars mavzularini aniqlay olmadi.");
    }

    return normalized;
  } catch (err: any) {
    console.error("AI Curriculum Parsing Failed:", err, "\nRaw Response:", jsonStr);
    throw new Error(err.message || "AI javobini o'qishda xatolik yuz berdi.");
  }
}

/**
 * Generate complete curriculum syllabus from user topic prompt and lesson count
 */
export async function generateCurriculumFromPrompt(
  topicPrompt: string,
  lessonCount: number = 12
): Promise<{
  courseTitle?: string;
  courseDescription?: string;
  items: CurriculumImportRow[];
}> {
  if (!topicPrompt || topicPrompt.trim().length === 0) {
    throw new Error("Iltimos, dars mavzusi yoki kurs yo‘nalishini kiriting.");
  }

  const count = Math.min(Math.max(lessonCount, 1), 72);

  const systemPrompt = `Siz professional ta'lim metodisti va o'quv dasturlari (curriculum) bo'yicha ekspert AI yordamchisiz.
Sizga o'qituvchi kurs yo'nalishi va darslar sonini beradi.

SIZNING VAZIFANGIZ:
Ushbu soha bo'yicha noldan boshlab bosqichma-bosqich, professional va chuqur ${count} ta darslik to'liq ish rejasini (o'quv dasturi) ishlab chiqish va quyidagi JSON formatida qaytarish:
{
  "courseTitle": "Kursning to'liq nomi",
  "courseDescription": "Kurs haqida batafsil ma'lumot va o'rganiladigan texnologiyalar",
  "items": [
    {
      "orderNumber": 1,
      "title": "Mavzu nomi (aniq va professional)",
      "description": "Darsda o'rganiladigan asosiy nazariy tushunchalar",
      "objective": "Ushbu darsdan kutilayotgan aniq ta'limiy maqsad",
      "practice": "Dars davomida qilinadigan amaliy mashg'ulot / loyiha",
      "homeworkPlan": "O'quvchiga beriladigan mustaqil uy vazifasi",
      "durationMinutes": 90,
      "category": "Modul yoki bo'lim nomi"
    }
  ]
}

QOIDALAR:
1. FAQAT yaroqli JSON qaytaring. Markdown bloklari (\`\`\`json ...) ichiga oling.
2. Darslar soni aynan ${count} ta bo'lsin.
3. Darslar mantiqiy ketma-ketlikda (soddadan murakkabga) joylashsin.
4. Har bir dars uchun amaliy mashg'ulot va uy vazifasi real hayotiy va foydali bo'lsin.
5. Tartib raqami 1 dan ${count} gacha ketma-ket ketsin.`;

  const userPrompt = `Menga quyidagi mavzu bo'yicha ${count} ta darsdan iborat to'liq ish rejasi tuzib bering:\n"${topicPrompt.trim()}"`;

  const response = await callAIProvider({
    systemPrompt,
    userPrompt,
    jsonMode: true,
  });

  let jsonStr = response.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const rawParsed = JSON.parse(jsonStr);
    const normalized = normalizeAIResponse(rawParsed);

    if (normalized.items.length === 0) {
      throw new Error("AI dars rejasini shakllantira olmadi.");
    }

    return normalized;
  } catch (err: any) {
    console.error("AI Curriculum Generation Failed:", err, "\nRaw Response:", jsonStr);
    throw new Error(err.message || "AI dars rejasini tuzishda xatolik yuz berdi.");
  }
}
