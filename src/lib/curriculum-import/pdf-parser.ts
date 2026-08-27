import { CurriculumImportRow } from "./types";
import { parseGenericDocumentText } from "./detect-structure";
import * as zlib from "zlib";

/**
 * Pure JS PDF Stream Text Extractor Fallback
 */
function extractPdfStreamsPureJs(buffer: Buffer): string {
  const chunks: string[] = [];
  const binary = buffer.toString("binary");
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(binary)) !== null) {
    const raw = Buffer.from(match[1], "binary");
    let decomp = "";
    try {
      decomp = zlib.inflateSync(raw).toString("utf-8");
    } catch {
      try {
        decomp = zlib.inflateRawSync(raw).toString("utf-8");
      } catch {
        decomp = raw.toString("utf-8");
      }
    }

    // Extract text in parentheses (text) Tj or [(text1)(text2)] TJ
    const textMatches = decomp.match(/\(([^()]*)\)/g);
    if (textMatches) {
      for (const tm of textMatches) {
        const clean = tm.slice(1, -1).trim();
        if (clean.length > 0) {
          chunks.push(clean);
        }
      }
    }
  }

  return chunks.join("\n");
}

/**
 * Extract curriculum rows and metadata from PDF buffer using Gemini Multimodal AI with unpdf fallback
 */
export async function parsePdfBuffer(fileBuffer: Buffer | ArrayBuffer): Promise<{
  detectedTitle?: string;
  detectedDescription?: string;
  rows: CurriculumImportRow[];
  unparsedText: string;
  isScannedPdf: boolean;
  rawText: string;
}> {
  const nodeBuffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);

  // 1. PRIMARY: Gemini Multimodal Native PDF Extraction (Visually and textually reads all pages)
  try {
    const { callGeminiMultimodalFile, getAIConfig } = await import("@/lib/ai/provider");
    const config = getAIConfig();

    if (config.isConfigured) {
      const systemPrompt = `Siz professional ta'lim metodisti va o'quv dasturlari (curriculum) bo'yicha ekspert AI yordamchisiz.
Sizga o'quv markazi yoki maktabning dars ish rejasi / o'quv dasturi PDF hujjati berilmoqda.

SIZNING VAZIFANGIZ:
Ushbu PDF hujjatning BARCHA sahifalarini (boshidan oxirigacha) to'liq va sinchkovlik bilan o'qib, undagi BARCHA darslarni bitta ham qoldirmasdan quyidagi JSON formatida qaytarish:
{
  "courseTitle": "Hujjatdagi kurs/fan nomi",
  "courseDescription": "Kurs haqida umumiy tavsif",
  "items": [
    {
      "orderNumber": 1,
      "title": "Dars mavzusi (aniq, toza, hechnarsa qisqartirilmasin)",
      "description": "Darsda o'rganiladigan asosiy nazariy tushunchalar",
      "objective": "Dars maqsadi",
      "practice": "Amaliy mashg'ulot / topshiriq",
      "homeworkPlan": "Uyga vazifa",
      "durationMinutes": 90,
      "category": "Modul yoki bo'lim nomi"
    }
  ]
}

QAT'IY QOIDALAR:
1. Hujjatdagi BARCHA darslarni (masalan 1-darsdan to oxirgi darsgacha, barcha 72 ta yoki nechtaligi qat'iy nazar) to'liq chiqaring.
2. Dars raqamlarini (orderNumber) 1 dan boshlab ketma-ket qo'ying.
3. Sarlavhalar, jadval ustunlari yoki muallif ismlarini dars mavzusi sifatida kiritmang.
4. FAQAT yaroqli JSON qaytaring. Markdown bloklari ichiga oling.`;

      const userPrompt =
        "Ushbu PDF hujjatdagi barcha dars mavzulari va rejalarini boshidan oxirigacha to'liq o'qib, tartibli JSON formatida bering.";

      const rawResponse = await callGeminiMultimodalFile({
        systemPrompt,
        userPrompt,
        fileBuffer: nodeBuffer,
        mimeType: "application/pdf",
        jsonMode: true,
        maxOutputTokens: 8192,
        temperature: 0.1,
      });

      let jsonStr = rawResponse.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        const { aiCurriculumSchema } = await import("./types");
        const validated = aiCurriculumSchema.parse(parsed);

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
          detectedTitle: validated.courseTitle,
          detectedDescription: validated.courseDescription,
          rows,
          unparsedText: "",
          isScannedPdf: false,
          rawText: rawResponse,
        };
      }
    }
  } catch (aiErr) {
    console.warn("Gemini Multimodal PDF extraction failed, using unpdf fallback:", aiErr);
  }

  // 2. FALLBACK: unpdf text stream extraction
  let rawText = "";

  try {
    const { extractText } = await import("unpdf");
    const res = await extractText(new Uint8Array(nodeBuffer));
    if (typeof res === "string") {
      rawText = res;
    } else if (res && typeof res.text === "string") {
      rawText = res.text;
    } else if (res && Array.isArray((res as any).pages)) {
      rawText = (res as any).pages.map((p: any) => p.text || "").join("\n");
    }
  } catch (pdfErr) {
    console.warn("unpdf primary extraction failed, trying pure JS stream decompressor:", pdfErr);
  }

  // Fallback to pure JS stream extractor if empty or failed
  if (!rawText || rawText.trim().length === 0) {
    try {
      rawText = extractPdfStreamsPureJs(nodeBuffer);
    } catch (streamErr) {
      console.warn("Pure JS stream extraction error:", streamErr);
    }
  }

  // Scanned PDF detection: If extracted text is empty or very short (< 20 characters)
  const cleanSample = rawText.replace(/[\s\r\n\t]/g, "");
  if (cleanSample.length < 20) {
    return {
      rows: [],
      unparsedText: rawText,
      isScannedPdf: true,
      rawText,
    };
  }

  // Process all pages using smart structure parser
  const struct = parseGenericDocumentText(rawText);

  // If no lessons detected despite having text, check if it's mostly unreadable or image-heavy
  const isScanned = struct.items.length === 0 && cleanSample.length < 100;

  return {
    detectedTitle: struct.detectedTitle,
    detectedDescription: struct.detectedDescription,
    rows: struct.items,
    unparsedText: struct.unparsedLines.join("\n"),
    isScannedPdf: isScanned,
    rawText,
  };
}
