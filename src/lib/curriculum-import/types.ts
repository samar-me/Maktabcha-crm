import { z } from "zod";

/**
 * Supported File Extensions and MIME Types
 */
export type SupportedFileType = "xlsx" | "xls" | "csv" | "docx" | "pdf" | "txt";

export interface FileValidationResult {
  valid: boolean;
  fileType?: SupportedFileType;
  error?: string;
  fileSizeFormatted?: string;
}

/**
 * Normalized Curriculum Import Row (Standard Output for all Parsers)
 */
export interface CurriculumImportRow {
  orderNumber?: number;
  title: string;
  description?: string;
  objective?: string;
  practice?: string;
  homeworkPlan?: string;
  durationMinutes?: number;
  category?: string;
  plannedDate?: string;
}

/**
 * Zod Schema for strict row validation
 */
export const curriculumImportRowSchema = z.object({
  orderNumber: z.number().int().positive().optional(),
  title: z.string().min(1, "Mavzu nomi kiritilishi shart").max(300, "Mavzu nomi juda uzun"),
  description: z.string().optional(),
  objective: z.string().optional(),
  practice: z.string().optional(),
  homeworkPlan: z.string().optional(),
  durationMinutes: z.number().int().positive().max(600).optional(),
  category: z.string().optional(),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD formatida bo‘lishi kerak").optional().or(z.literal("")),
});

/**
 * Row with validation status for preview UI
 */
export interface ParsedRowItem extends CurriculumImportRow {
  id: string; // client-side temp id for key & edit
  status: "valid" | "warning" | "error";
  warnings: string[];
  errors: string[];
}

/**
 * Excel sheet info for multi-sheet workbooks
 */
export interface ExcelSheetInfo {
  name: string;
  rowCount: number;
}

/**
 * Complete Parser Output
 */
export interface UniversalParseResult {
  success: boolean;
  fileType: SupportedFileType;
  fileName: string;
  fileSizeFormatted: string;
  detectedTitle?: string;
  detectedDescription?: string;
  items: ParsedRowItem[];
  unparsedText?: string;
  isScannedPdf?: boolean;
  sheets?: ExcelSheetInfo[];
  selectedSheet?: string;
  error?: string;
}

/**
 * AI Document Extraction Schema
 */
export const aiCurriculumSchema = z.object({
  courseTitle: z.string().nullish().transform((v) => v || undefined),
  courseDescription: z.string().nullish().transform((v) => v || undefined),
  items: z.array(
    z.object({
      orderNumber: z.number().nullish().transform((v) => (v ? Math.round(v) : undefined)),
      title: z.string().nullish().transform((v) => (v || "").trim()).refine((v) => v.length > 0, "Mavzu nomi kiritilishi shart"),
      description: z.string().nullish().transform((v) => v || ""),
      objective: z.string().nullish().transform((v) => v || ""),
      practice: z.string().nullish().transform((v) => v || ""),
      homeworkPlan: z.string().nullish().transform((v) => v || ""),
      durationMinutes: z.number().nullish().transform((v) => (v ? Math.round(v) : 90)),
      category: z.string().nullish().transform((v) => v || ""),
    })
  ),
});

export type AICurriculumPayload = z.infer<typeof aiCurriculumSchema>;
