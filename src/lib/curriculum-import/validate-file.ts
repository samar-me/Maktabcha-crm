import { FileValidationResult, SupportedFileType } from "./types";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILE_SIZE_MB = 10;

export const SUPPORTED_EXTENSIONS: SupportedFileType[] = [
  "xlsx",
  "xls",
  "csv",
  "docx",
  "pdf",
  "txt",
];

export const ACCEPTED_FILE_TYPES_ATTR =
  ".xlsx,.xls,.csv,.docx,.pdf,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain";

/**
 * Format bytes to readable string (e.g. 1.2 MB or 450 KB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Detect file type from filename and MIME type
 */
export function detectFileType(fileName: string, mimeType?: string): SupportedFileType | null {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "xlsx") return "xlsx";
  if (ext === "xls") return "xls";
  if (ext === "csv") return "csv";
  if (ext === "docx") return "docx";
  if (ext === "pdf") return "pdf";
  if (ext === "txt") return "txt";

  if (mimeType) {
    if (mimeType.includes("spreadsheetml") || mimeType.includes("excel")) return "xlsx";
    if (mimeType.includes("csv")) return "csv";
    if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) return "docx";
    if (mimeType.includes("pdf")) return "pdf";
    if (mimeType.includes("text/plain")) return "txt";
  }

  return null;
}

/**
 * Validate file before parsing
 */
export function validateImportFile(
  file: { name: string; size: number; type?: string },
  maxSizeBytes: number = MAX_FILE_SIZE_BYTES
): FileValidationResult {
  if (!file || !file.name) {
    return {
      valid: false,
      error: "Fayl tanlanmadi.",
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: "Fayl bo‘sh (0 bayt). Iltimos, ma'lumotli fayl tanlang.",
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      fileSizeFormatted: formatFileSize(file.size),
      error: `Fayl juda katta. Maksimal hajm ${MAX_FILE_SIZE_MB} MB.`,
    };
  }

  const detected = detectFileType(file.name, file.type);
  if (!detected) {
    return {
      valid: false,
      fileSizeFormatted: formatFileSize(file.size),
      error: "Bu fayl turi qo‘llab-quvvatlanmaydi. Faqat Excel (.xlsx, .xls), Word (.docx), PDF (.pdf), CSV (.csv) yoki matn (.txt) fayllari qabul qilinadi.",
    };
  }

  return {
    valid: true,
    fileType: detected,
    fileSizeFormatted: formatFileSize(file.size),
  };
}
