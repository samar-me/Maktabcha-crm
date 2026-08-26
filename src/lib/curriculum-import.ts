import * as XLSX from "xlsx";
import { CurriculumImportRow, CurriculumImportPreview } from "@/types/curriculum";

/**
 * Generate Excel Template file (.xlsx) for Curriculum plan
 */
export function generateCurriculumExcelTemplate(): Uint8Array {
  const headers = [
    "№",
    "Mavzu",
    "Maqsad",
    "Tavsif",
    "Amaliyot",
    "Uy vazifasi",
    "Davomiyligi",
    "Kategoriya",
    "Sana",
  ];

  const sampleData = [
    [
      1,
      "Kompyuter bilan tanishuv va xavfsizlik",
      "Kompyuter qurilmalari va ish joyi xavfsizlik qoidalari",
      "Asosiy va qo‘shimcha qurilmalar, operatsion tizim tushunchasi",
      "Kompyuterni yoqish, sichqoncha va klaviatura bilan mashqlar",
      "O‘tilgan qoidalarni takrorlash",
      90,
      "Kirish",
      "",
    ],
    [
      2,
      "Fayllar va papkalar bilan ishlash",
      "Fayllar tizimi va ularni tartibga solish",
      "Papka yaratish, nomini o‘zgartirish, nusxalash va o‘chirish",
      "Desktopda shaxsiy portfolio papkasi yaratish",
      "5 ta yangi papka yaratib ichiga matnli fayllar joylash",
      90,
      "Operatsion tizim",
      "",
    ],
    [
      3,
      "Telegram Desktop o‘rnatish va sozlash",
      "Telegram dasturini o‘rnatish va ta'lim guruhlariga ulanish",
      "Telegram Desktop yuklab olish va asosiy sozlamalarni to‘g‘rilash",
      "Telegram o‘rnatish, guruhga qo‘shilish, bot bilan bog‘lanish",
      "Sozlamalarni mustaqil tekshirib skrinshot olish",
      90,
      "Amaliy dasturlar",
      "",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths
  ws["!cols"] = [
    { wch: 6 }, // №
    { wch: 40 }, // Mavzu
    { wch: 35 }, // Maqsad
    { wch: 40 }, // Tavsif
    { wch: 40 }, // Amaliyot
    { wch: 35 }, // Uy vazifasi
    { wch: 14 }, // Davomiyligi
    { wch: 20 }, // Kategoriya
    { wch: 14 }, // Sana
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ish reja");

  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(buffer);
}

/**
 * Clean line text from leading list numbering (e.g. "1. ", "2) ", "№3: ")
 */
export function cleanTopicLine(line: string): string {
  return line
    .replace(/^(\d+\s*[\.\)\-:]\s*|№\s*\d+\s*[\.\)\-:]?\s*)/i, "")
    .trim();
}

/**
 * Parse bulk text where each line represents a lesson topic
 */
export function parseBulkTextCurriculum(text: string): CurriculumImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line, idx) => {
    const cleaned = cleanTopicLine(line);
    return {
      orderNumber: idx + 1,
      title: cleaned || line,
      durationMinutes: 90,
    };
  });
}

/**
 * Parse Excel file (.xlsx / .csv) into validated rows
 */
export function parseExcelCurriculumFile(data: ArrayBuffer): CurriculumImportPreview {
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { totalRows: 0, validRows: [], warningRows: [], invalidRows: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

  if (!jsonRows || jsonRows.length <= 1) {
    return { totalRows: 0, validRows: [], warningRows: [], invalidRows: [] };
  }

  const headerRow: string[] = (jsonRows[0] || []).map((h: any) =>
    String(h || "").trim().toLowerCase()
  );

  // Column index detector
  const findCol = (...candidates: string[]) => {
    return headerRow.findIndex((h) =>
      candidates.some((c) => h === c.toLowerCase() || h.includes(c.toLowerCase()))
    );
  };

  const colOrder = findCol("№", "t/r", "order", "tartib", "raqam");
  const colTitle = findCol("mavzu", "title", "topic", "mavzu nomi", "dars");
  const colObjective = findCol("maqsad", "objective", "dars maqsadi");
  const colDesc = findCol("tavsif", "description", "mazmun", "izoh");
  const colPractice = findCol("amaliyot", "practice", "amaliy");
  const colHomework = findCol("uy vazifasi", "uy vazifa", "homework", "topshiriq");
  const colDuration = findCol("davomiyligi", "duration", "vaqt", "minut");
  const colCategory = findCol("kategoriya", "category", "bo‘lim", "bolim", "modul");
  const colDate = findCol("sana", "date", "rejalashtirilgan sana");

  const validRows: CurriculumImportRow[] = [];
  const warningRows: Array<{ row: CurriculumImportRow; warnings: string[] }> = [];
  const invalidRows: Array<{ row: any; errors: string[] }> = [];

  const seenTitles = new Set<string>();

  for (let rIdx = 1; rIdx < jsonRows.length; rIdx++) {
    const rawRow = jsonRows[rIdx];
    if (!rawRow || rawRow.length === 0 || rawRow.every((c: any) => c === undefined || c === "")) {
      continue; // Skip empty row
    }

    const titleRaw = colTitle !== -1 ? rawRow[colTitle] : rawRow[1] || rawRow[0];
    const title = String(titleRaw || "").trim();

    if (!title || title.length < 2) {
      invalidRows.push({
        row: rawRow,
        errors: [`${rIdx + 1}-qatorda mavzu nomi kiritilmagan`],
      });
      continue;
    }

    const orderRaw = colOrder !== -1 ? Number(rawRow[colOrder]) : rIdx;
    const orderNumber = !isNaN(orderRaw) && orderRaw > 0 ? orderRaw : rIdx;

    const objective = colObjective !== -1 ? String(rawRow[colObjective] || "").trim() : undefined;
    const description = colDesc !== -1 ? String(rawRow[colDesc] || "").trim() : undefined;
    const practice = colPractice !== -1 ? String(rawRow[colPractice] || "").trim() : undefined;
    const homeworkPlan = colHomework !== -1 ? String(rawRow[colHomework] || "").trim() : undefined;

    const durationRaw = colDuration !== -1 ? Number(rawRow[colDuration]) : 90;
    const durationMinutes = !isNaN(durationRaw) && durationRaw > 0 ? durationRaw : 90;

    const category = colCategory !== -1 ? String(rawRow[colCategory] || "").trim() : undefined;
    const plannedDate = colDate !== -1 ? String(rawRow[colDate] || "").trim() : undefined;

    const rowObj: CurriculumImportRow = {
      orderNumber,
      title,
      objective: objective || undefined,
      description: description || undefined,
      practice: practice || undefined,
      homeworkPlan: homeworkPlan || undefined,
      durationMinutes,
      category: category || undefined,
      plannedDate: plannedDate || undefined,
    };

    const warnings: string[] = [];
    const normTitle = title.toLowerCase();
    if (seenTitles.has(normTitle)) {
      warnings.push("Mavzu nomi fayl ichida takrorlangan");
    }
    seenTitles.add(normTitle);

    if (warnings.length > 0) {
      warningRows.push({ row: rowObj, warnings });
    } else {
      validRows.push(rowObj);
    }
  }

  return {
    totalRows: validRows.length + warningRows.length + invalidRows.length,
    validRows,
    warningRows,
    invalidRows,
  };
}
