import { callAIProvider } from "@/lib/ai/provider";
import { aiCurriculumSchema, CurriculumImportRow } from "./types";

/**
 * AI-Assisted Structure Extraction for messy documents or unstructured educational text
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

  // Safety: Limit context size to 40,000 characters
  const trimmedText = documentText.slice(0, 40000);

  const systemPrompt = `Siz ta'lim metodisti va o'quv dasturlari (ish reja) tuzish bo'yicha mutaxassis AI yordamchisiz.
Sizga o'quv markazi yoki maktabning dars ish rejasi / o'quv dasturi matni beriladi.

SIZNING VAZIFANGIZ:
Ushbu matnni tahlil qilib, dars mavzulari va rejasini quyidagi JSON formatida qaytarish:
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
3. Hujjatning sarlavhasi yoki muallif ma'lumotlarini dars mavzusi sifatida kiritmang ("courseTitle"ga yozing).
4. Tartib raqami (orderNumber) 1 dan boshlab ketma-ket ketsin.
5. Hech qanday boshqa izoh yoki matn qo'shmang.`;

  const userPrompt = `Quyidagi o'quv dasturi matnini tahlil qilib, JSON shakliga keltiring:\n\n${trimmedText}`;

  const response = await callAIProvider({
    systemPrompt,
    userPrompt,
    jsonMode: true,
  });

  // Extract JSON from response
  let jsonStr = response.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const rawParsed = JSON.parse(jsonStr);
    const validated = aiCurriculumSchema.parse(rawParsed);

    const rows: CurriculumImportRow[] = validated.items.map((item, idx) => ({
      orderNumber: item.orderNumber || idx + 1,
      title: item.title,
      description: item.description,
      objective: item.objective,
      practice: item.practice,
      homeworkPlan: item.homeworkPlan,
      durationMinutes: item.durationMinutes || 90,
      category: item.category,
    }));

    return {
      courseTitle: validated.courseTitle,
      courseDescription: validated.courseDescription,
      items: rows,
    };
  } catch (err: any) {
    console.error("AI Curriculum Parsing Validation Failed:", err, "\nRaw Response:", jsonStr);
    throw new Error(
      "AI javobini o'qishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring yoki matnni tekshiring."
    );
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
    const validated = aiCurriculumSchema.parse(rawParsed);

    const rows: CurriculumImportRow[] = validated.items.map((item, idx) => ({
      orderNumber: item.orderNumber || idx + 1,
      title: item.title,
      description: item.description,
      objective: item.objective,
      practice: item.practice,
      homeworkPlan: item.homeworkPlan,
      durationMinutes: item.durationMinutes || 90,
      category: item.category,
    }));

    return {
      courseTitle: validated.courseTitle,
      courseDescription: validated.courseDescription,
      items: rows,
    };
  } catch (err: any) {
    console.error("AI Curriculum Generation Validation Failed:", err, "\nRaw Response:", jsonStr);
    throw new Error("AI dars rejasini shakllantirishda xatolik yuz berdi. Qayta urinib ko‘ring.");
  }
}
