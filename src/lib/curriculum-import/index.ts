export * from "./types";
export * from "./validate-file";
export * from "./normalize";
export * from "./detect-structure";
export * from "./excel-parser";
export * from "./csv-parser";
export * from "./docx-parser";
export * from "./pdf-parser";
export * from "./text-parser";
export * from "./ai-fallback-parser";

import { SupportedFileType, UniversalParseResult } from "./types";
import { validateImportFile, formatFileSize } from "./validate-file";
import { normalizeParsedRows } from "./normalize";
import { parseExcelSheet, getExcelWorkbookInfo } from "./excel-parser";
import { parseCsvContent } from "./csv-parser";
import { parseDocxBuffer } from "./docx-parser";
import { parsePdfBuffer } from "./pdf-parser";
import { parseTextContent } from "./text-parser";
import { CurriculumImportRow } from "./types";

/**
 * Backward compatibility helper for bulk text parsing
 */
export function parseBulkTextCurriculum(rawText: string): CurriculumImportRow[] {
  return parseTextContent(rawText).rows;
}

/**
 * Backward compatibility helper for legacy Excel parser signature
 */
export function parseExcelCurriculumFile(fileBuffer: ArrayBuffer | Buffer): {
  validRows: CurriculumImportRow[];
  warningRows: CurriculumImportRow[];
  invalidRows: { row: number; reason: string }[];
} {
  const res = parseExcelSheet(fileBuffer);
  return {
    validRows: res.rows,
    warningRows: [],
    invalidRows: [],
  };
}

/**
 * Universal Entrypoint to parse any supported curriculum file
 */
export async function parseUniversalCurriculumFile(
  fileData: {
    name: string;
    size: number;
    buffer: Buffer | ArrayBuffer;
    type?: string;
    sheetName?: string;
  }
): Promise<UniversalParseResult> {
  // 1. Validate file
  const validation = validateImportFile({
    name: fileData.name,
    size: fileData.size,
    type: fileData.type,
  });

  if (!validation.valid || !validation.fileType) {
    return {
      success: false,
      fileType: (validation.fileType || "txt") as SupportedFileType,
      fileName: fileData.name,
      fileSizeFormatted: validation.fileSizeFormatted || formatFileSize(fileData.size),
      items: [],
      error: validation.error || "Faylni tekshirishda xatolik.",
    };
  }

  const fileType = validation.fileType;
  const fileSizeFormatted = validation.fileSizeFormatted || formatFileSize(fileData.size);

  try {
    switch (fileType) {
      case "xlsx":
      case "xls": {
        const excelRes = parseExcelSheet(fileData.buffer, fileData.sheetName);
        const normalized = normalizeParsedRows(excelRes.rows);
        return {
          success: true,
          fileType,
          fileName: fileData.name,
          fileSizeFormatted,
          items: normalized,
          sheets: excelRes.sheets,
          selectedSheet: excelRes.selectedSheet,
        };
      }

      case "csv": {
        const csvRows = parseCsvContent(fileData.buffer);
        const normalized = normalizeParsedRows(csvRows);
        return {
          success: true,
          fileType,
          fileName: fileData.name,
          fileSizeFormatted,
          items: normalized,
        };
      }

      case "docx": {
        const docxRes = await parseDocxBuffer(fileData.buffer);
        const normalized = normalizeParsedRows(docxRes.rows);
        return {
          success: true,
          fileType,
          fileName: fileData.name,
          fileSizeFormatted,
          detectedTitle: docxRes.detectedTitle,
          detectedDescription: docxRes.detectedDescription,
          items: normalized,
          unparsedText: docxRes.unparsedText,
        };
      }

      case "pdf": {
        const pdfRes = await parsePdfBuffer(fileData.buffer);
        const normalized = normalizeParsedRows(pdfRes.rows);
        return {
          success: !pdfRes.isScannedPdf || normalized.length > 0,
          fileType,
          fileName: fileData.name,
          fileSizeFormatted,
          detectedTitle: pdfRes.detectedTitle,
          detectedDescription: pdfRes.detectedDescription,
          items: normalized,
          unparsedText: pdfRes.unparsedText,
          isScannedPdf: pdfRes.isScannedPdf,
          error: pdfRes.isScannedPdf && normalized.length === 0
            ? "Bu PDF skanerlangan rasm ko‘rinishida. Matnni avtomatik o‘qib bo‘lmadi."
            : undefined,
        };
      }

      case "txt": {
        const txtRes = parseTextContent(fileData.buffer);
        const normalized = normalizeParsedRows(txtRes.rows);
        return {
          success: true,
          fileType,
          fileName: fileData.name,
          fileSizeFormatted,
          detectedTitle: txtRes.detectedTitle,
          detectedDescription: txtRes.detectedDescription,
          items: normalized,
          unparsedText: txtRes.unparsedText,
        };
      }

      default:
        return {
          success: false,
          fileType,
          fileName: fileData.name,
          fileSizeFormatted,
          items: [],
          error: "Bu fayl turi qo‘llab-quvvatlanmaydi.",
        };
    }
  } catch (err: any) {
    console.error(`Error parsing ${fileType} file:`, err);
    return {
      success: false,
      fileType,
      fileName: fileData.name,
      fileSizeFormatted,
      items: [],
      error: err.message || "Faylni tahlil qilishda kutilmagan xatolik yuz berdi.",
    };
  }
}
