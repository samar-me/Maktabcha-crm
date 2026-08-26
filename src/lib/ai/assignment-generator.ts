import {
  AIGeneratorSource,
  AIGeneratorSettings,
  GeneratedAssignmentDraft,
  GeneratedQuestion,
  generatedAssignmentDraftSchema,
  generatedQuestionSchema,
} from "./types";
import { callAIProvider } from "./provider";

const SYSTEM_PROMPT_TEMPLATE = `Siz ta'lim va test savollari bo‘yicha professional metodist hamda mutaxassissiz.
Sizning vazifangiz berilgan mavzu yoki dars materiali asosida yuqori sifatli, aniq va xolis test topshiriqlarini yaratishdir.

MUHIM QOIDALAR:
1. Til: O‘zbek tili (Lotin alifbosida), grammatik va uslubiy jihatdan benuqson bo‘lsin (agar materialning o‘zi ingliz yoki rus tilida bo‘lmasa).
2. Variantlar: Har bir savolda aynan 1 ta ob'ektiv to‘g‘ri javob ("isCorrect": true) va qolganlari mantiqiy, chalg‘ituvchi noto‘g‘ri variantlar ("isCorrect": false) bo‘lishi shart.
3. Variantlar soni: Har bir savolda so‘ralgan sonda variant bo‘lsin.
4. Chalg‘ituvchi variantlar: Hazil yoki bema'ni variantlar bo‘lmasin. Barcha variantlar uzunligi va uslubi bo‘yicha bir-biriga yaqin bo‘lsin.
5. Savol matnida "To‘g‘ri javob B" yoki "Javob: ..." kabi ishoralar bo‘lmasin.
6. Takrorlanmaslik: Bir xil tushuncha yoki deyarli bir xil savol/variantlar qaytarilmasin.
7. To‘g‘ri javob o‘rni: To‘g‘ri javob har doim 1- yoki 2-variantda bo‘lib qolmasin, turli pozitsiyalarga teng taqsimlansin.
8. Format: Faqat toza JSON formatida javob qaytaring. Markdown bloklari (\`\`\`json) qo‘shmang.`;

/**
 * Clean and parse raw JSON string from AI
 */
function parseCleanJSON(rawText: string): any {
  let cleaned = rawText.trim();
  // Remove markdown code fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned);
}

/**
 * Balance correct option positions so they are evenly distributed across options
 */
function balanceOptionPositions(questions: GeneratedQuestion[], optionCount: number): GeneratedQuestion[] {
  return questions.map((q, qIdx) => {
    const correctIndex = q.options.findIndex((o) => o.isCorrect);
    if (correctIndex === -1) return q;

    // Desired target index for this question to ensure uniform distribution
    const targetIndex = qIdx % Math.min(q.options.length, optionCount);

    if (correctIndex !== targetIndex && targetIndex < q.options.length) {
      const newOptions = [...q.options];
      const temp = newOptions[correctIndex];
      newOptions[correctIndex] = newOptions[targetIndex];
      newOptions[targetIndex] = temp;
      return { ...q, options: newOptions };
    }
    return q;
  });
}

/**
 * Deduplicate questions based on normalized question text
 */
function deduplicateQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const seen = new Set<string>();
  const unique: GeneratedQuestion[] = [];

  for (const q of questions) {
    const normalized = q.question.toLowerCase().replace(/[^a-z0-9a-z‘ʼ]/g, "").trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(q);
    }
  }
  return unique;
}

/**
 * Generate full assignment draft from source and settings
 */
export async function generateAssignmentDraft(
  source: AIGeneratorSource,
  settings: AIGeneratorSettings
): Promise<GeneratedAssignmentDraft> {
  const questionCount = Math.max(3, Math.min(30, settings.questionCount || 10));
  const optionCount = Math.max(2, Math.min(6, settings.optionCount || 4));
  const difficulty = settings.difficulty || "O‘rtacha";
  const styles = settings.styles?.length > 0 ? settings.styles.join(", ") : "Aralash";

  let contextDescription = "";

  if (source.type === "topic") {
    contextDescription = `MANBA TURI: Mavzu\nMAVZU: ${source.topic || "Umumiy mavzu"}\nQO‘SHIMCHA KO‘RSATMA: ${source.instruction || "Mavzuni to‘liq qamrab olinsin."}`;
  } else if (source.type === "crm_lesson" && source.lessonContext) {
    const ctx = source.lessonContext;
    contextDescription = `MANBA TURI: CRM Darsi\nKURS YOKI GURUH: ${ctx.courseName || ctx.groupName || ""}\nDARS MAVZUSI: ${ctx.topic}\nDARS TAVSIFI: ${ctx.description || "Tavsif yo‘q"}\nUYGA VAZIFA: ${ctx.homework || "Vazifa yo‘q"}`;
  } else if (source.type === "curriculum" && source.curriculumContext) {
    const ctx = source.curriculumContext;
    contextDescription = `MANBA TURI: O‘quv rejasi (Ish reja)\nKURS / FAN: ${ctx.courseName || ""}\nMAVZU: ${ctx.title}\nMAQSAD: ${ctx.objective || "Kiritilmagan"}\nTAVSIF: ${ctx.description || "Kiritilmagan"}\nAMALIYOT: ${ctx.practice || "Kiritilmagan"}\nUY VAZIFASI REJASI: ${ctx.homeworkPlan || "Kiritilmagan"}`;
  } else if (source.type === "text") {
    const trimmedText = (source.textMaterial || "").slice(0, 10000).trim();
    contextDescription = `MANBA TURI: Darslik/Matn materiali\nMATN MAZMUNI:\n"""\n${trimmedText}\n"""\nSavollar asosan ushbu matnda berilgan faktlar va tushunchalar asosida tuzilsin.`;
  }

  const userPrompt = `${contextDescription}

TALABLAR:
- Savollar soni: ${questionCount} ta
- Har bir savolda variantlar soni: ${optionCount} ta
- Qiyinlik darajasi: ${difficulty}
- Savollar uslubi: ${styles}

KUTILAYOTGAN JSON STRUKTURASI:
{
  "title": "Topshiriq sarlavhasi",
  "description": "Topshiriq haqida qisqacha tavsif",
  "questions": [
    {
      "question": "Savol matni?",
      "options": [
        { "text": "Variant 1", "isCorrect": false },
        { "text": "Variant 2", "isCorrect": true },
        { "text": "Variant 3", "isCorrect": false },
        { "text": "Variant 4", "isCorrect": false }
      ],
      "difficulty": "medium",
      "explanation": "Nega aynan shu javob to‘g‘riligi haqida o‘qituvchi uchun qisqa izoh"
    }
  ]
}`;

  let rawResponse = "";
  try {
    rawResponse = await callAIProvider({
      systemPrompt: SYSTEM_PROMPT_TEMPLATE,
      userPrompt,
      temperature: 0.3,
      jsonMode: true,
    });
  } catch (err: any) {
    throw new Error(err.message || "AI xizmati bilan bog‘lanishda xatolik");
  }

  // Parse and validate with 1 repair attempt if needed
  let parsedDraft: GeneratedAssignmentDraft;

  try {
    const json = parseCleanJSON(rawResponse);
    parsedDraft = generatedAssignmentDraftSchema.parse(json);
  } catch (parseErr) {
    console.warn("AI JSON parse failed, attempting 1 repair request...", parseErr);

    const repairPrompt = `Siz avval quyidagi noto‘g‘ri formatdagi javobni qaytardingiz:\n"""\n${rawResponse.slice(0, 3000)}\n"""\nIltimos, ushbu ma'lumotlarni to‘g‘rilab, talab qilingan toza JSON formatida qaytaring.`;

    const repairedResponse = await callAIProvider({
      systemPrompt: SYSTEM_PROMPT_TEMPLATE,
      userPrompt: repairPrompt,
      temperature: 0.1,
      jsonMode: true,
    });

    try {
      const repairedJson = parseCleanJSON(repairedResponse);
      parsedDraft = generatedAssignmentDraftSchema.parse(repairedJson);
    } catch (finalErr) {
      throw new Error("AI natijasini tekshirishda xatolik yuz berdi. Qayta urinib ko‘ring.");
    }
  }

  // Deduplicate and balance options
  const uniqueQuestions = deduplicateQuestions(parsedDraft.questions);
  const balancedQuestions = balanceOptionPositions(uniqueQuestions, optionCount);

  return {
    title: parsedDraft.title.trim() || "Yangi Topshiriq",
    description: parsedDraft.description?.trim() || "",
    questions: balancedQuestions,
  };
}

/**
 * Regenerate a single question while avoiding existing questions
 */
export async function regenerateSingleQuestion(
  source: AIGeneratorSource,
  settings: AIGeneratorSettings,
  existingQuestions: Array<{ question: string }>,
  questionToReplace: string
): Promise<GeneratedQuestion> {
  const optionCount = Math.max(2, Math.min(6, settings.optionCount || 4));
  const difficulty = settings.difficulty || "O‘rtacha";

  const existingList = existingQuestions.map((q, i) => `${i + 1}. ${q.question}`).join("\n");

  const prompt = `MAVZU/MANBA: ${source.topic || source.lessonContext?.topic || "Dars mavzusi"}
Qiyinlik: ${difficulty}
Variantlar soni: ${optionCount} ta

ALMASHTIRILAYOTGAN SAVOL: "${questionToReplace}"

HOZIRGI TESTDAGI BOSHQA SAVOLLAR (BULARDAN MUTLAQO FARQ QILISHI VA TAKRORLANMASLIGI KERAK):
${existingList}

VAZIFA:
Almashtirilayotgan savol o‘rniga yangi, qiziqarli va ob'ektiv 1 ta savol tuzing.

KUTILAYOTGAN JSON STRUKTURASI:
{
  "question": "Yangi savol matni?",
  "options": [
    { "text": "Variant 1", "isCorrect": true },
    { "text": "Variant 2", "isCorrect": false },
    { "text": "Variant 3", "isCorrect": false },
    { "text": "Variant 4", "isCorrect": false }
  ],
  "difficulty": "medium",
  "explanation": "To‘g‘ri javob izohi"
}`;

  const rawResponse = await callAIProvider({
    systemPrompt: SYSTEM_PROMPT_TEMPLATE,
    userPrompt: prompt,
    temperature: 0.5,
    jsonMode: true,
  });

  const json = parseCleanJSON(rawResponse);
  const validated = generatedQuestionSchema.parse(json);

  // Ensure exactly one correct answer
  const correctCount = validated.options.filter((o) => o.isCorrect).length;
  if (correctCount !== 1 && validated.options.length > 0) {
    validated.options.forEach((o, i) => (o.isCorrect = i === 0));
  }

  return validated;
}

/**
 * Improve an existing single question based on teacher's instruction
 */
export async function improveSingleQuestion(
  source: AIGeneratorSource,
  currentQuestion: GeneratedQuestion,
  instruction: string
): Promise<GeneratedQuestion> {
  const prompt = `MAVZU: ${source.topic || source.lessonContext?.topic || "Dars mavzusi"}

HOZIRGI SAVOL:
Savol: ${currentQuestion.question}
Variantlar:
${currentQuestion.options.map((o) => `- ${o.text} (${o.isCorrect ? "TO‘G‘RI" : "noto‘g‘ri"})`).join("\n")}

O‘QITUVCHI KO‘RSATMASI (YAXSHILASH BO‘YICHA):
"${instruction}"

VAZIFA:
O‘qituvchi ko‘rsatmasiga binoan ushbu savolni yaxshilang va faqat 1 ta savol JSON obyektini qaytaring.

KUTILAYOTGAN JSON STRUKTURASI:
{
  "question": "Yaxshilangan savol matni?",
  "options": [
    { "text": "Variant 1", "isCorrect": true },
    { "text": "Variant 2", "isCorrect": false },
    { "text": "Variant 3", "isCorrect": false },
    { "text": "Variant 4", "isCorrect": false }
  ],
  "difficulty": "medium",
  "explanation": "To‘g‘ri javob izohi"
}`;

  const rawResponse = await callAIProvider({
    systemPrompt: SYSTEM_PROMPT_TEMPLATE,
    userPrompt: prompt,
    temperature: 0.3,
    jsonMode: true,
  });

  const json = parseCleanJSON(rawResponse);
  const validated = generatedQuestionSchema.parse(json);

  const correctCount = validated.options.filter((o) => o.isCorrect).length;
  if (correctCount !== 1 && validated.options.length > 0) {
    validated.options.forEach((o, i) => (o.isCorrect = i === 0));
  }

  return validated;
}
