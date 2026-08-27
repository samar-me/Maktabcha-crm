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
    let rawText = "";

    // Dynamic require to prevent bundling errors in different environments
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseModule = require("pdf-parse");

    if (typeof pdfParseModule === "function") {
      const pdfData = await pdfParseModule(nodeBuffer);
      rawText = pdfData?.text || "";
    } else if (pdfParseModule?.PDFParse) {
      const parser = new pdfParseModule.PDFParse({
        data: new Uint8Array(nodeBuffer),
      });
      const parsed = await parser.getText();
      rawText = typeof parsed === "string" ? parsed : (parsed?.text || "");
      if (typeof parser.destroy === "function") {
        await parser.destroy().catch(() => {});
      }
    } else if (pdfParseModule?.default && typeof pdfParseModule.default === "function") {
      const pdfData = await pdfParseModule.default(nodeBuffer);
      rawText = pdfData?.text || "";
    } else {
      throw new Error("PDF tahlil qilish modulini yuklab bo‘lmadi.");
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
  } catch (err: any) {
    console.error("PDF Parsing Error:", err);
    throw new Error(err.message || "PDF faylini o‘qishda xatolik yuz berdi.");
  }
}
