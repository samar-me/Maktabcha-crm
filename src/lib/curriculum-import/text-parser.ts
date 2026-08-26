import { CurriculumImportRow } from "./types";
import { parseGenericDocumentText } from "./detect-structure";

/**
 * Parse plain text string or buffer
 */
export function parseTextContent(textData: string | Buffer | ArrayBuffer): {
  detectedTitle?: string;
  detectedDescription?: string;
  rows: CurriculumImportRow[];
  unparsedText: string;
} {
  let text = "";
  if (typeof textData === "string") {
    text = textData;
  } else if (Buffer.isBuffer(textData)) {
    text = textData.toString("utf-8");
  } else {
    text = new TextDecoder("utf-8").decode(textData);
  }

  // Remove UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const struct = parseGenericDocumentText(text);

  return {
    detectedTitle: struct.detectedTitle,
    detectedDescription: struct.detectedDescription,
    rows: struct.items,
    unparsedText: struct.unparsedLines.join("\n"),
  };
}
