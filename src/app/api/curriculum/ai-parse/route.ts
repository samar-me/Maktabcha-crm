import { NextRequest, NextResponse } from "next/server";
import { parseCurriculumWithAI, generateCurriculumFromPrompt } from "@/lib/curriculum-import/ai-fallback-parser";

// Allow up to 60 seconds for AI responses on Vercel
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, text, prompt, lessonCount } = body;

    if (type === "parse-text") {
      if (!text || !text.trim()) {
        return NextResponse.json({ success: false, error: "Matn kiritilmagan." }, { status: 400 });
      }
      const result = await parseCurriculumWithAI(text);
      return NextResponse.json({ success: true, data: result });
    }

    if (type === "generate") {
      if (!prompt || !prompt.trim()) {
        return NextResponse.json({ success: false, error: "Kurs mavzusi kiritilmagan." }, { status: 400 });
      }
      const result = await generateCurriculumFromPrompt(prompt, lessonCount || 12);
      return NextResponse.json({ success: true, data: result });
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
