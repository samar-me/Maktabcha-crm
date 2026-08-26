import { CurriculumImportRow } from "./types";
import { cleanTopicLine, sanitizeString } from "./normalize";

// Words and patterns that indicate document headers, footers or page info (NOT lessons)
const HEADER_EXCLUDE_PATTERNS = [
  /^(kurs\s+haqida|kurs\s+rejasi|o['‘`]?quv\s+dasturi|ish\s+rejasi|mavzular\s+reja)/i,
  /^(muallif|tuzuvchi|tasdiqlayman|o['‘`]?qituvchi|markaz|akademiyasi)/i,
  /^(jami\s+soat|haftada|davomiyligi\s*:|oylik\s+reja)/i,
  /^(sahifa\s*\d+|page\s*\d+|\d+\s*-\s*sahifa|\d+\s*\/\s*\d+)/i,
  /^(№|dars\s*№|mavzu|dars\s+mavzusi|asosiy\s+mazmun|amaliy\s+natija|uy\s+vazifasi)[\s\|\t]*$/i,
];

/**
 * Check if a text line is a repeated header/table title/footer
 */
export function isDocumentHeaderOrFooter(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;

  for (const pattern of HEADER_EXCLUDE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // Pure line of dashes or underscores
  if (/^[\-\=\_\*\|\s]+$/.test(trimmed)) return true;

  return false;
}

/**
 * Check if a line starts a new lesson/topic
 */
export function matchLessonStart(line: string): {
  isMatch: boolean;
  orderNumber?: number;
  topicTitle: string;
} {
  const trimmed = line.trim();
  if (isDocumentHeaderOrFooter(trimmed)) {
    return { isMatch: false, topicTitle: "" };
  }

  // Pattern 1: Explicit numbering like "1.", "1 -", "1 —", "1)", "№ 1:", "Dars 1:", "1-dars."
  const numMatch = trimmed.match(
    /^(?:dars\s*#?\s*(\d+)[\s\.\)\:\-\u2010-\u2015\u2212]*|(\d+)\s*[\-\u2010-\u2015\u2212]?\s*dars[\s\.\)\:\-\u2010-\u2015\u2212]*|№\s*(\d+)[\s\.\)\:\-\u2010-\u2015\u2212]*|#\s*(\d+)[\s\.\)\:\-\u2010-\u2015\u2212]*|(\d+)\s*[\.\)\:\-\u2010-\u2015\u2212]\s*)(.*)$/i
  );

  if (numMatch) {
    const numStr = numMatch[1] || numMatch[2] || numMatch[3] || numMatch[4] || numMatch[5];
    const orderNumber = numStr ? parseInt(numStr, 10) : undefined;
    const topicTitle = cleanTopicLine(numMatch[6] || "");

    if (topicTitle.length > 0) {
      return { isMatch: true, orderNumber, topicTitle };
    }
  }

  // Pattern 2: Number followed by 2 or more spaces/tab and then text: "1   Kompyuter qanday ishlaydi?"
  const spaceNumMatch = trimmed.match(/^(\d+)\s{2,}(.+)$/);
  if (spaceNumMatch) {
    const orderNumber = parseInt(spaceNumMatch[1], 10);
    const topicTitle = cleanTopicLine(spaceNumMatch[2]);
    if (topicTitle.length > 0) {
      return { isMatch: true, orderNumber, topicTitle };
    }
  }

  return { isMatch: false, topicTitle: "" };
}

/**
 * Smart Structure Parser for freeform educational text / multi-page document lines
 */
export function parseGenericDocumentText(rawText: string): {
  detectedTitle?: string;
  detectedDescription?: string;
  items: CurriculumImportRow[];
  unparsedLines: string[];
} {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: CurriculumImportRow[] = [];
  const unparsedLines: string[] = [];

  let detectedTitle: string | undefined;
  let detectedDescription: string | undefined;

  let currentItem: CurriculumImportRow | null = null;
  let lineIndex = 0;

  // 1. Try to extract course title from the very first non-empty lines if they are document headers
  while (lineIndex < Math.min(lines.length, 5)) {
    const firstLine = lines[lineIndex];
    if (
      !matchLessonStart(firstLine).isMatch &&
      (firstLine.toUpperCase() === firstLine ||
        firstLine.toLowerCase().includes("ish reja") ||
        firstLine.toLowerCase().includes("dastur") ||
        firstLine.toLowerCase().includes("kurs"))
    ) {
      if (!detectedTitle) {
        detectedTitle = sanitizeString(firstLine);
      } else if (!detectedDescription && firstLine.length > 10) {
        detectedDescription = sanitizeString(firstLine);
      }
      lineIndex++;
    } else {
      break;
    }
  }

  // 2. Iterate through remaining lines
  for (; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // Skip repeated page headers, table headers, or dividers
    if (isDocumentHeaderOrFooter(line)) {
      continue;
    }

    // Check if line is a table row separated by pipes: "| 1 | Mavzu | Asosiy mazmun | Amaliyot |"
    if (line.includes("|")) {
      const parts = line
        .split("|")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      // Check if this looks like header row
      if (
        parts.some((p) =>
          /^(№|no|dars|mavzu|asosiy mazmun|amaliy|amaliy natija)$/i.test(p)
        )
      ) {
        continue;
      }

      if (parts.length >= 2) {
        // Save previous item
        if (currentItem) items.push(currentItem);

        const firstNum = parseInt(parts[0].replace(/\D/g, ""), 10);
        const orderNumber = !isNaN(firstNum) && firstNum > 0 ? firstNum : undefined;
        const topicIdx = orderNumber !== undefined ? 1 : 0;
        const title = cleanTopicLine(parts[topicIdx] || "");

        if (title.length > 0) {
          currentItem = {
            orderNumber: orderNumber || items.length + 1,
            title,
            description: parts[topicIdx + 1] ? sanitizeString(parts[topicIdx + 1]) : undefined,
            practice: parts[topicIdx + 2] ? sanitizeString(parts[topicIdx + 2]) : undefined,
            homeworkPlan: parts[topicIdx + 3] ? sanitizeString(parts[topicIdx + 3]) : undefined,
          };
          continue;
        }
      }
    }

    // Check for standard lesson numbering
    const startMatch = matchLessonStart(line);
    if (startMatch.isMatch) {
      // Save previous item
      if (currentItem) items.push(currentItem);

      currentItem = {
        orderNumber: startMatch.orderNumber || items.length + 1,
        title: startMatch.topicTitle,
        description: "",
        practice: "",
        homeworkPlan: "",
      };
      continue;
    }

    // If we have an active lesson item, append description/practice details
    if (currentItem) {
      const lower = line.toLowerCase();
      if (lower.startsWith("amaliyot:") || lower.startsWith("amaliy natija:") || lower.startsWith("natija:")) {
        const text = line.replace(/^[^:]+:\s*/i, "");
        currentItem.practice = currentItem.practice ? `${currentItem.practice}; ${text}` : text;
      } else if (lower.startsWith("uyga vazifa:") || lower.startsWith("uy vazifasi:") || lower.startsWith("vazifa:")) {
        const text = line.replace(/^[^:]+:\s*/i, "");
        currentItem.homeworkPlan = currentItem.homeworkPlan ? `${currentItem.homeworkPlan}; ${text}` : text;
      } else if (lower.startsWith("maqsad:") || lower.startsWith("dars maqsadi:")) {
        const text = line.replace(/^[^:]+:\s*/i, "");
        currentItem.objective = currentItem.objective ? `${currentItem.objective}; ${text}` : text;
      } else if (lower.startsWith("mazmun:") || lower.startsWith("tavsif:") || lower.startsWith("asosiy mazmun:")) {
        const text = line.replace(/^[^:]+:\s*/i, "");
        currentItem.description = currentItem.description ? `${currentItem.description}; ${text}` : text;
      } else {
        // Regular description text continuation
        if (!currentItem.description) {
          currentItem.description = line;
        } else if (!currentItem.practice) {
          currentItem.practice = line;
        } else {
          currentItem.description += ` ${line}`;
        }
      }
    } else {
      // Unparsed line before any lesson
      unparsedLines.push(line);
    }
  }

  // Push final item
  if (currentItem) items.push(currentItem);

  // Fallback: If no numbered lessons were matched at all, treat each non-empty line as a topic
  if (items.length === 0 && lines.length > 0) {
    let order = 1;
    for (const l of lines) {
      if (isDocumentHeaderOrFooter(l)) continue;
      const clean = cleanTopicLine(l);
      if (clean.length > 0 && clean.length < 150) {
        items.push({
          orderNumber: order++,
          title: clean,
        });
      } else {
        unparsedLines.push(l);
      }
    }
  }

  return {
    detectedTitle,
    detectedDescription,
    items,
    unparsedLines,
  };
}
