import { CurriculumImportRow, ParsedRowItem } from "./types";

/**
 * Sanitize strings: removes invisible control characters, strips scripts/tags, trims
 */
export function sanitizeString(val: any): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  // Remove control characters except standard whitespace/newlines
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // Strip potential html/script tags
  str = str.replace(/<[^>]*>?/gm, "");
  // Normalize whitespace
  str = str.replace(/[ \t\r\f\v]+/g, " ");
  return str.trim();
}

/**
 * Clean topic line from numbering prefixes like:
 * - "1. Windows Master"
 * - "1 - Windows Master"
 * - "1) Windows Master"
 * - "№ 2: Kompyuter"
 * - "Dars 3: Algoritm"
 * - "3-dars. Algoritm"
 * - "Dars #4 - Funksiyalar"
 */
export function cleanTopicLine(line: string): string {
  if (!line) return "";
  let cleaned = sanitizeString(line);

  // Common Uzbek / English lesson prefixes with all dash variants (-, –, —, −)
  cleaned = cleaned
    .replace(/^(dars\s*#?\s*\d+[\s\.\)\:\-\u2010-\u2015\u2212]*|\d+\s*[\-\u2010-\u2015\u2212]?\s*dars[\s\.\)\:\-\u2010-\u2015\u2212]*)/i, "")
    .replace(/^(\d+\s*[\.\)\:\-\u2010-\u2015\u2212]\s*|№\s*\d+\s*[\.\)\:\-\u2010-\u2015\u2212]?\s*|#\s*\d+\s*[\.\)\:\-\u2010-\u2015\u2212]?\s*)/i, "")
    .trim();

  return cleaned;
}

/**
 * Parse duration minutes safely
 */
export function parseDurationMinutes(val: any, defaultMinutes: number = 90): number {
  if (!val) return defaultMinutes;
  const num = parseInt(String(val).replace(/\D/g, ""), 10);
  if (isNaN(num) || num <= 0) return defaultMinutes;
  if (num > 600) return 600;
  return num;
}

/**
 * Parse and normalize date into YYYY-MM-DD or return undefined
 */
export function parsePlannedDate(val: any): string | undefined {
  if (!val) return undefined;
  const str = sanitizeString(val);
  if (!str) return undefined;

  // Check standard ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Check DD.MM.YYYY
  const ruMatch = str.match(/^(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})/);
  if (ruMatch) {
    const d = ruMatch[1].padStart(2, "0");
    const m = ruMatch[2].padStart(2, "0");
    const y = ruMatch[3];
    return `${y}-${m}-${d}`;
  }

  return undefined;
}

/**
 * Normalize an array of extracted rows into verified ParsedRowItems
 */
export function normalizeParsedRows(
  rawRows: CurriculumImportRow[],
  existingStartingOrder: number = 1
): ParsedRowItem[] {
  const seenTitles = new Set<string>();
  const seenOrderNumbers = new Set<number>();

  let currentOrder = existingStartingOrder;

  return rawRows.map((raw, index) => {
    const title = sanitizeString(raw.title);
    const orderNumber = raw.orderNumber && raw.orderNumber > 0 ? raw.orderNumber : currentOrder++;

    const warnings: string[] = [];
    const errors: string[] = [];

    // Title validation
    if (!title || title.length === 0) {
      errors.push("Mavzu nomi bo‘sh bo‘lishi mumkin emas");
    } else if (title.length > 150) {
      warnings.push("Mavzu nomi juda uzun (150 belgidan ortiq)");
    }

    // Duplicate Title Detection
    const normalizedTitleKey = title.toLowerCase().replace(/\s+/g, " ");
    if (seenTitles.has(normalizedTitleKey) && title.length > 0) {
      warnings.push("Ushbu mavzu faylda takrorlangan");
    } else if (title.length > 0) {
      seenTitles.add(normalizedTitleKey);
    }

    // Duplicate Order Number Detection
    if (seenOrderNumbers.has(orderNumber)) {
      warnings.push(`Dars raqami №${orderNumber} takrorlangan`);
    } else {
      seenOrderNumbers.add(orderNumber);
    }

    // Duration validation
    let durationMinutes = raw.durationMinutes;
    if (durationMinutes !== undefined && (durationMinutes <= 0 || durationMinutes > 600)) {
      warnings.push("Davomiylik vaqti noodatiy (1–600 daqiqa oralig‘ida bo‘lishi kerak)");
      durationMinutes = 90;
    }

    // Date validation
    let plannedDate = raw.plannedDate ? parsePlannedDate(raw.plannedDate) : undefined;
    if (raw.plannedDate && !plannedDate) {
      warnings.push("Sana formati aniqlanmadi (YYYY-MM-DD kutilgan)");
    }

    const status: "valid" | "warning" | "error" =
      errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

    return {
      id: `row-${index + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderNumber,
      title,
      description: sanitizeString(raw.description),
      objective: sanitizeString(raw.objective),
      practice: sanitizeString(raw.practice),
      homeworkPlan: sanitizeString(raw.homeworkPlan),
      durationMinutes: durationMinutes || 90,
      category: sanitizeString(raw.category),
      plannedDate,
      status,
      warnings,
      errors,
    };
  });
}
