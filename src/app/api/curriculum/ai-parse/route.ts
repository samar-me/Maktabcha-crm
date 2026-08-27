import { NextRequest, NextResponse } from "next/server";

// Allow up to 60 seconds for AI responses on Vercel Hobby plan
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Lightweight direct Gemini call — no extra abstraction layers
 * Bypasses callAIProvider so we control timeout directly in the route
 */
async function callGeminiDirect(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  // Try primary model, then fallbacks
  const models = [model, "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError: any;

  for (const m of [...new Set(models)]) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 404) continue; // try next model

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Gemini API xatosi (${response.status}): ${body.slice(0, 200)}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) throw new Error("AI bo'sh javob qaytardi.");
      return text.trim();
    } catch (err: any) {
      lastError = err;
      if (err.message?.includes("API xatosi")) throw err;
    }
  }

  throw lastError || new Error("AI xizmatiga ulanib bo'lmadi.");
}

/**
 * Normalize any shape of AI JSON response into clean items array
 */
function normalizeAIJson(raw: any): { courseTitle?: string; courseDescription?: string; items: any[] } {
  const courseTitle = raw?.courseTitle || raw?.title || raw?.kurs_nomi || undefined;
  const courseDescription = raw?.courseDescription || raw?.description || raw?.tavsif || undefined;

  let rawList: any[] = [];
  if (Array.isArray(raw)) rawList = raw;
  else if (Array.isArray(raw?.items)) rawList = raw.items;
  else if (Array.isArray(raw?.lessons)) rawList = raw.lessons;
  else if (Array.isArray(raw?.darslar)) rawList = raw.darslar;
  else if (Array.isArray(raw?.curriculum)) rawList = raw.curriculum;
  else if (Array.isArray(raw?.topics)) rawList = raw.topics;
  else if (Array.isArray(raw?.mavzular)) rawList = raw.mavzular;

  const items = rawList
    .filter(Boolean)
    .map((r: any, i: number) => {
      const title = (r.title || r.nomi || r.name || r.mavzu || r.lesson || r.topic || "")
        .toString()
        .trim();
      if (!title) return null;
      return {
        orderNumber: Number(r.orderNumber || r.tartib_raqami || r.order || r.id || i + 1) || i + 1,
        title,
        description: (r.description || r.tavsif || r.mazmun || "").toString().trim(),
        objective: (r.objective || r.maqsad || "").toString().trim(),
        practice: (r.practice || r.amaliyot || "").toString().trim(),
        homeworkPlan: (r.homeworkPlan || r.homework || r.uyga_vazifa || "").toString().trim(),
        durationMinutes: Number(r.durationMinutes || r.davomiyligi || 90) || 90,
        category: (r.category || r.modul || r.bolim || "").toString().trim(),
      };
    })
    .filter(Boolean);

  return {
    courseTitle: courseTitle ? String(courseTitle).trim() : undefined,
    courseDescription: courseDescription ? String(courseDescription).trim() : undefined,
    items,
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "AI API kaliti sozlanmagan." }, { status: 500 });
    }

    const rawModel = process.env.AI_MODEL || "gemini-3.6-flash";
    // Sanitize model name — reject deprecated preview models
    const model =
      rawModel.includes("preview") || rawModel === "gemini-2.5-flash"
        ? "gemini-3.6-flash"
        : rawModel;

    const body = await request.json();
    const { type, text, prompt, lessonCount } = body;

    if (type === "parse-text") {
      if (!text?.trim()) {
        return NextResponse.json({ success: false, error: "Matn kiritilmagan." }, { status: 400 });
      }

      const trimmedText = text.slice(0, 30000);
      const systemPrompt = `Siz professional o'quv dasturlari (curriculum) mutaxassisi AI yordamchisiz.
Siz berilgan o'quv reja matnidagi BARCHA dars mavzularini topib, toza JSON formatida qaytarasiz.

JSON formati:
{
  "courseTitle": "Kurs nomi",
  "items": [
    { "orderNumber": 1, "title": "Mavzu nomi", "description": "Tavsif", "category": "Modul" }
  ]
}

QOIDALAR:
- FAQAT JSON qaytaring, hech qanday qo'shimcha matn yo'q
- Barcha darslarni bitta ham qoldirmay chiqaring
- orderNumber 1 dan boshlab ketma-ket`;

      const userPrompt = `Quyidagi matndan barcha dars mavzularini chiqarib, JSON formatida bering:\n\n${trimmedText}`;

      const rawText = await callGeminiDirect(apiKey, model, systemPrompt, userPrompt);

      let parsed: any;
      try {
        // Strip markdown code blocks if present
        const clean = rawText.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/gi, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        return NextResponse.json(
          { success: false, error: "AI javobini tahlil qilishda xatolik. Qayta urinib ko'ring." },
          { status: 500 }
        );
      }

      const normalized = normalizeAIJson(parsed);
      if (normalized.items.length === 0) {
        return NextResponse.json(
          { success: false, error: "AI hech qanday dars mavzusini aniqlay olmadi. Matnni tekshiring." },
          { status: 422 }
        );
      }

      return NextResponse.json({ success: true, data: normalized });
    }

    if (type === "generate") {
      if (!prompt?.trim()) {
        return NextResponse.json({ success: false, error: "Kurs mavzusi kiritilmagan." }, { status: 400 });
      }

      const count = Math.min(Math.max(Number(lessonCount) || 12, 1), 48);

      const systemPrompt = `Siz professional ta'lim metodisti AI yordamchisiz.
Berilgan kurs mavzusi bo'yicha ${count} ta darsdan iborat to'liq o'quv dasturi tuzing.

JSON formati:
{
  "courseTitle": "Kursning to'liq nomi",
  "courseDescription": "Kurs tavsifi",
  "items": [
    {
      "orderNumber": 1,
      "title": "Mavzu nomi",
      "description": "Dars mazmuni",
      "objective": "Dars maqsadi",
      "practice": "Amaliy mashg'ulot",
      "homeworkPlan": "Uyga vazifa",
      "durationMinutes": 90,
      "category": "Modul nomi"
    }
  ]
}

QOIDALAR:
- FAQAT JSON qaytaring
- Darslar soni aynan ${count} ta bo'lsin
- Soddadan murakkabga ketsin`;

      const userPrompt = `"${prompt.trim()}" mavzusi bo'yicha ${count} ta darslik o'quv dasturi tuzing.`;

      const rawText = await callGeminiDirect(apiKey, model, systemPrompt, userPrompt);

      let parsed: any;
      try {
        const clean = rawText.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/gi, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        return NextResponse.json(
          { success: false, error: "AI javobini tahlil qilishda xatolik. Qayta urinib ko'ring." },
          { status: 500 }
        );
      }

      const normalized = normalizeAIJson(parsed);
      if (normalized.items.length === 0) {
        return NextResponse.json(
          { success: false, error: "AI dars rejasini shakllantira olmadi. Qayta urinib ko'ring." },
          { status: 422 }
        );
      }

      return NextResponse.json({ success: true, data: normalized });
    }

    return NextResponse.json({ success: false, error: "Noto'g'ri so'rov turi." }, { status: 400 });
  } catch (err: any) {
    console.error("AI Curriculum API Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "AI tahlilida xatolik yuz berdi." },
      { status: 500 }
    );
  }
}
