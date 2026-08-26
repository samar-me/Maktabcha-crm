import * as XLSX from "xlsx";
import { CurriculumImportRow, ExcelSheetInfo } from "./types";
import {
  cleanTopicLine,
  parseDurationMinutes,
  parsePlannedDate,
  sanitizeString,
} from "./normalize";

// Column mapping dictionaries (case-insensitive)
const COLUMN_ALIASES = {
  orderNumber: [
    "№",
    "no",
    "no.",
    "n",
    "raqam",
    "dars №",
    "dars raqami",
    "tartib",
    "tartib raqami",
    "order",
    "id",
  ],
  title: [
    "mavzu",
    "mavzusi",
    "dars mavzusi",
    "mavzu nomi",
    "dars",
    "dars nomi",
    "dars mavzulari",
    "tema",
    "topic",
    "title",
    "name",
    "lesson",
  ],
  description: [
    "tavsif",
    "mazmun",
    "asosiy mazmun",
    "dars mazmuni",
    "nazariya",
    "izoh",
    "description",
    "content",
    "summary",
    "details",
  ],
  objective: [
    "maqsad",
    "dars maqsadi",
    "kutilayotgan natija",
    "objective",
    "goal",
    "purpose",
  ],
  practice: [
    "amaliyot",
    "amaliy natija",
    "amaliy mashg‘ulot",
    "mashq",
    "laboratoriya",
    "practice",
    "practical",
    "result",
  ],
  homeworkPlan: [
    "uy vazifasi",
    "uyga vazifa",
    "vazifa",
    "topshiriq",
    "homework",
    "assignment",
    "task",
  ],
  durationMinutes: [
    "davomiyligi",
    "vaqt",
    "soat",
    "daqiqa",
    "davomiylik",
    "duration",
    "duration_minutes",
    "time",
  ],
  category: [
    "kategoriya",
    "bolim",
    "bo‘lim",
    "modul",
    "fan",
    "category",
    "module",
    "section",
  ],
  plannedDate: [
    "sana",
    "rejalashtirilgan sana",
    "dars sanasi",
    "kun",
    "date",
    "planned_date",
  ],
};

function normalizeHeaderKey(header: string): keyof typeof COLUMN_ALIASES | null {
  const clean = header.toLowerCase().trim().replace(/['"`]/g, "");
  for (const [canonicalKey, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some((alias) => clean === alias || clean.startsWith(alias))) {
      return canonicalKey as keyof typeof COLUMN_ALIASES;
    }
  }
  return null;
}

/**
 * Inspect Excel workbook for sheets
 */
export function getExcelWorkbookInfo(fileBuffer: ArrayBuffer | Buffer): {
  sheets: ExcelSheetInfo[];
  defaultSheet: string;
} {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheets: ExcelSheetInfo[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
    const rowCount = range.e.r - range.s.r + 1;
    return { name, rowCount };
  });

  return {
    sheets,
    defaultSheet: workbook.SheetNames[0] || "Sheet1",
  };
}

/**
 * Parse specific Excel sheet into structured CurriculumImportRow array
 */
export function parseExcelSheet(
  fileBuffer: ArrayBuffer | Buffer,
  sheetName?: string
): {
  rows: CurriculumImportRow[];
  sheets: ExcelSheetInfo[];
  selectedSheet: string;
} {
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const sheetsInfo = getExcelWorkbookInfo(fileBuffer).sheets;
  const targetSheetName = sheetName && workbook.Sheets[sheetName] ? sheetName : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];

  if (!worksheet) {
    return { rows: [], sheets: sheetsInfo, selectedSheet: targetSheetName };
  }

  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (!rawData || rawData.length === 0) {
    return { rows: [], sheets: sheetsInfo, selectedSheet: targetSheetName };
  }

  // Find header row (first row with at least 1 string that matches column aliases)
  let headerRowIndex = 0;
  let columnIndices: Partial<Record<keyof typeof COLUMN_ALIASES, number>> = {};

  for (let i = 0; i < Math.min(rawData.length, 10); i++) {
    const row = rawData[i];
    const candidateMap: Partial<Record<keyof typeof COLUMN_ALIASES, number>> = {};
    let matchesCount = 0;

    row.forEach((cell, colIdx) => {
      const cellStr = String(cell || "").trim();
      const mappedKey = normalizeHeaderKey(cellStr);
      if (mappedKey && candidateMap[mappedKey] === undefined) {
        candidateMap[mappedKey] = colIdx;
        matchesCount++;
      }
    });

    if (matchesCount >= 1 && (candidateMap.title !== undefined || candidateMap.orderNumber !== undefined)) {
      headerRowIndex = i;
      columnIndices = candidateMap;
      break;
    }
  }

  // If no title column was explicitly found, fallback: column 0 is order/title, column 1 is title/desc
  if (columnIndices.title === undefined) {
    if (rawData[headerRowIndex]?.length === 1) {
      columnIndices.title = 0;
    } else {
      columnIndices.orderNumber = 0;
      columnIndices.title = 1;
      columnIndices.description = 2;
      columnIndices.practice = 3;
    }
  }

  const extractedRows: CurriculumImportRow[] = [];
  let autoOrder = 1;

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    // Check if entire row is empty
    const rowStr = row.map((c) => String(c || "").trim()).join("");
    if (!rowStr) continue;

    const rawTitle = columnIndices.title !== undefined ? row[columnIndices.title] : "";
    const title = cleanTopicLine(String(rawTitle || ""));
    if (!title) continue;

    const rawOrder = columnIndices.orderNumber !== undefined ? row[columnIndices.orderNumber] : null;
    const parsedOrder = rawOrder ? parseInt(String(rawOrder).replace(/\D/g, ""), 10) : NaN;
    const orderNumber = !isNaN(parsedOrder) && parsedOrder > 0 ? parsedOrder : autoOrder++;

    const rawDesc = columnIndices.description !== undefined ? row[columnIndices.description] : "";
    const rawObjective = columnIndices.objective !== undefined ? row[columnIndices.objective] : "";
    const rawPractice = columnIndices.practice !== undefined ? row[columnIndices.practice] : "";
    const rawHw = columnIndices.homeworkPlan !== undefined ? row[columnIndices.homeworkPlan] : "";
    const rawDuration = columnIndices.durationMinutes !== undefined ? row[columnIndices.durationMinutes] : "";
    const rawCat = columnIndices.category !== undefined ? row[columnIndices.category] : "";
    const rawDate = columnIndices.plannedDate !== undefined ? row[columnIndices.plannedDate] : "";

    extractedRows.push({
      orderNumber,
      title,
      description: sanitizeString(rawDesc),
      objective: sanitizeString(rawObjective),
      practice: sanitizeString(rawPractice),
      homeworkPlan: sanitizeString(rawHw),
      durationMinutes: parseDurationMinutes(rawDuration, 90),
      category: sanitizeString(rawCat),
      plannedDate: parsePlannedDate(rawDate),
    });
  }

  return {
    rows: extractedRows,
    sheets: sheetsInfo,
    selectedSheet: targetSheetName,
  };
}

/**
 * Generate a downloadable Excel template (.xlsx) with sample data
 */
export function generateCurriculumExcelTemplate(): Uint8Array {
  const headers = [
    "№",
    "Mavzu",
    "Maqsad",
    "Asosiy mazmun",
    "Amaliy natija",
    "Uy vazifasi",
    "Davomiyligi (daqiqa)",
    "Kategoriya",
    "Sana",
  ];

  const sampleRows = [
    [
      1,
      "Kompyuter tuzilishi va operatsion tizim",
      "Kompyuterning asosiy qismlari va Windows tizimi bilan tanishish",
      "Protsessor, operativ xotira (RAM), doimiy xotira (SSD/HDD), kiritish-chiqarish qurilmalari",
      "Kompyuter xususiyatlarini ko‘rish va fayllar tuzilmasini yaratish",
      "1-bob savollariga javob berish va kompyuter parametrlarini yozib kelish",
      90,
      "Kompyuter savodxonligi",
      "2025-09-02",
    ],
    [
      2,
      "Internet va raqamli xavfsizlik asoslari",
      "Internet brauzerlari, qidiruv tizimlari va xavfsiz parollar yaratish",
      "Google Chrome, qidiruv operatorlari, 2FA ikki bosqichli himoya, phishing xavfi",
      "Kuchli parol yaratish va Google hisobini xavfsiz sozlash",
      "O‘z pochtasida 2FA xavfsizlikni yoqish",
      90,
      "Kompyuter savodxonligi",
      "2025-09-05",
    ],
    [
      3,
      "Matn muharrirlari bilan ishlash (Word / Google Docs)",
      "Hujjatlarni formatlash, jadvallar va rasmlar joylash",
      "Shriftlar, abzaslar, sarlavha stillari, jadvallar va eksport",
      "Rezyume (CV) shablonini to‘ldirish va PDF formatida saqlash",
      "O‘zi haqida 1 sahifalik ma'lumotnoma tayyorlash",
      90,
      "Ofis dasturlari",
      "2025-09-09",
    ],
  ];

  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 40 },
    { wch: 45 },
    { wch: 55 },
    { wch: 45 },
    { wch: 40 },
    { wch: 20 },
    { wch: 25 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ish reja");

  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Uint8Array(wbOut);
}
