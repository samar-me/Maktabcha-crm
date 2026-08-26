import { CurriculumImportRow } from "./types";
import { parseExcelSheet } from "./excel-parser";
import * as XLSX from "xlsx";

/**
 * Detect delimiter in CSV (comma, semicolon, or tab)
 */
export function detectCsvDelimiter(csvText: string): string {
  const firstFewLines = csvText.split(/\r?\n/).slice(0, 5).join("\n");
  const commaCount = (firstFewLines.match(/,/g) || []).length;
  const semicolonCount = (firstFewLines.match(/;/g) || []).length;
  const tabCount = (firstFewLines.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) return ";";
  if (tabCount > commaCount && tabCount > semicolonCount) return "\t";
  return ",";
}

/**
 * Parse CSV buffer or string into structured curriculum rows
 */
export function parseCsvContent(
  csvData: string | Buffer | ArrayBuffer
): CurriculumImportRow[] {
  let text = "";
  if (typeof csvData === "string") {
    text = csvData;
  } else if (Buffer.isBuffer(csvData)) {
    text = csvData.toString("utf-8");
  } else {
    text = new TextDecoder("utf-8").decode(csvData);
  }

  // Remove UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const delimiter = detectCsvDelimiter(text);

  // We can leverage XLSX.read with CSV type and FS delimiter for robust quote & escape handling
  try {
    const workbook = XLSX.read(text, {
      type: "string",
      raw: false,
      FS: delimiter,
    });
    const result = parseExcelSheet(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
    return result.rows;
  } catch {
    // Fallback: simple line parser
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const rows: CurriculumImportRow[] = [];
    let order = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length >= 1 && cols[0].length > 0) {
        // Skip header if it contains non-data keywords
        if (i === 0 && /^(№|no|mavzu|topic|title)/i.test(cols[0])) continue;

        const firstNum = parseInt(cols[0].replace(/\D/g, ""), 10);
        const orderNumber = !isNaN(firstNum) && firstNum > 0 ? firstNum : order++;
        const title = isNaN(firstNum) ? cols[0] : cols[1] || cols[0];

        if (title) {
          rows.push({
            orderNumber,
            title,
            description: cols[2] || "",
            practice: cols[3] || "",
            homeworkPlan: cols[4] || "",
          });
        }
      }
    }

    return rows;
  }
}
