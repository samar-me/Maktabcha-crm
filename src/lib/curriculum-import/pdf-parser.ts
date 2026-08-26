// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import { CurriculumImportRow } from "./types";
import { parseGenericDocumentText } from "./detect-structure";

/**
 * Extract curriculum rows and metadata from PDF buffer
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

  try {
    const pdfData = await pdfParse(nodeBuffer);
    const rawText = pdfData.text || "";

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
  } catch (err: any) {
    console.error("PDF Parsing Error:", err);
    throw new Error(err.message || "PDF faylini o‘qishda xatolik yuz berdi.");
  }
}
