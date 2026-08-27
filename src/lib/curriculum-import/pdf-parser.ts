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
 * Extract curriculum rows and metadata from PDF buffer using unpdf with fallback
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
