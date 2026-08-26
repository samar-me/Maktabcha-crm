import mammoth from "mammoth";
import { CurriculumImportRow } from "./types";
import { parseGenericDocumentText } from "./detect-structure";
import { cleanTopicLine, sanitizeString } from "./normalize";

/**
 * Extract text and tables from DOCX buffer
 */
export async function parseDocxBuffer(fileBuffer: Buffer | ArrayBuffer): Promise<{
  detectedTitle?: string;
  detectedDescription?: string;
  rows: CurriculumImportRow[];
  unparsedText: string;
}> {
  const nodeBuffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);

  // 1. Extract raw text from docx
  const rawTextResult = await mammoth.extractRawText({ buffer: nodeBuffer });
  const rawText = rawTextResult.value || "";

  // 2. Also convert to HTML to easily extract tables if present
  let tableRows: CurriculumImportRow[] = [];
  try {
    const htmlResult = await mammoth.convertToHtml({ buffer: nodeBuffer });
    const html = htmlResult.value || "";

    if (html.includes("<table")) {
      tableRows = extractRowsFromDocxHtmlTables(html);
    }
  } catch (err) {
    console.warn("Could not parse DOCX HTML tables, falling back to text:", err);
  }

  // If table extraction found valid rows with titles, use them!
  if (tableRows.length >= 2) {
    return {
      rows: tableRows,
      unparsedText: "",
    };
  }

  // Otherwise, use smart document text structure detection
  const struct = parseGenericDocumentText(rawText);

  return {
    detectedTitle: struct.detectedTitle,
    detectedDescription: struct.detectedDescription,
    rows: struct.items,
    unparsedText: struct.unparsedLines.join("\n"),
  };
}

/**
 * Extract curriculum rows from HTML <table> markup produced by mammoth
 */
function extractRowsFromDocxHtmlTables(html: string): CurriculumImportRow[] {
  const rows: CurriculumImportRow[] = [];
  const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  let isFirstRow = true;
  let autoOrder = 1;

  for (const tr of trMatches) {
    const tdMatches = tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
    if (tdMatches.length === 0) continue;

    const cells = tdMatches.map((td) => {
      return td.replace(/<[^>]*>?/gm, "").trim();
    });

    // Check if this is the header row
    const rowStr = cells.join(" ").toLowerCase();
    if (
      isFirstRow ||
      rowStr.includes("mavzu") ||
      rowStr.includes("dars") ||
      rowStr.includes("topic")
    ) {
      if (
        cells.some((c) =>
          /^(№|no|dars|mavzu|topic|asosiy mazmun|amaliyot|amaliy natija)$/i.test(c.trim())
        )
      ) {
        isFirstRow = false;
        continue;
      }
    }
    isFirstRow = false;

    if (cells.length >= 2) {
      const firstNum = parseInt(cells[0].replace(/\D/g, ""), 10);
      const orderNumber = !isNaN(firstNum) && firstNum > 0 ? firstNum : autoOrder++;
      const topicIdx = !isNaN(firstNum) ? 1 : 0;
      const title = cleanTopicLine(cells[topicIdx] || "");

      if (title.length > 0) {
        rows.push({
          orderNumber,
          title,
          description: cells[topicIdx + 1] ? sanitizeString(cells[topicIdx + 1]) : "",
          practice: cells[topicIdx + 2] ? sanitizeString(cells[topicIdx + 2]) : "",
          homeworkPlan: cells[topicIdx + 3] ? sanitizeString(cells[topicIdx + 3]) : "",
        });
      }
    } else if (cells.length === 1 && cells[0].trim().length > 0) {
      const title = cleanTopicLine(cells[0]);
      if (title.length > 0) {
        rows.push({
          orderNumber: autoOrder++,
          title,
        });
      }
    }
  }

  return rows;
}
