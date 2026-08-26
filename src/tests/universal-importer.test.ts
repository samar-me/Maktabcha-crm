import * as XLSX from "xlsx";
import {
  validateImportFile,
  detectFileType,
  formatFileSize,
  parseUniversalCurriculumFile,
  parseGenericDocumentText,
  cleanTopicLine,
  parseDurationMinutes,
  parsePlannedDate,
  parseCsvContent,
  parseTextContent,
  normalizeParsedRows,
  generateCurriculumExcelTemplate,
} from "@/lib/curriculum-import";
import { CurriculumImportRow } from "@/lib/curriculum-import/types";

/**
 * Test Suite for Universal Curriculum Importer
 */
async function runUniversalImporterTests() {
  console.log("🚀 Starting Universal Curriculum Importer Test Suite...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      failed++;
    }
  }

  // 1. FILE VALIDATION TESTS
  try {
    const validXlsx = validateImportFile({ name: "darslar.xlsx", size: 1024 * 50 });
    assert(validXlsx.valid && validXlsx.fileType === "xlsx", "Validates .xlsx extension");

    const validDocx = validateImportFile({ name: "ish_reja.docx", size: 1024 * 100 });
    assert(validDocx.valid && validDocx.fileType === "docx", "Validates .docx extension");

    const validPdf = validateImportFile({ name: "reja.pdf", size: 1024 * 500 });
    assert(validPdf.valid && validPdf.fileType === "pdf", "Validates .pdf extension");

    const validCsv = validateImportFile({ name: "mavzular.csv", size: 1024 * 20 });
    assert(validCsv.valid && validCsv.fileType === "csv", "Validates .csv extension");

    const validTxt = validateImportFile({ name: "mavzular.txt", size: 1024 * 5 });
    assert(validTxt.valid && validTxt.fileType === "txt", "Validates .txt extension");

    const emptyFile = validateImportFile({ name: "bosh.xlsx", size: 0 });
    assert(!emptyFile.valid && Boolean(emptyFile.error?.includes("bo‘sh")), "Rejects empty 0-byte file");

    const oversizedFile = validateImportFile({ name: "katta.pdf", size: 15 * 1024 * 1024 });
    assert(!oversizedFile.valid && Boolean(oversizedFile.error?.includes("10 MB")), "Rejects oversized >10MB file");

    const unsupportedFile = validateImportFile({ name: "script.exe", size: 1024 });
    assert(!unsupportedFile.valid && Boolean(unsupportedFile.error?.includes("qo‘llab-quvvatlanmaydi")), "Rejects unsupported .exe extension");
  } catch (err: any) {
    console.error("File validation test error:", err);
    failed++;
  }

  // 2. NUMBERED LESSON DETECTION TESTS
  try {
    assert(cleanTopicLine("1. JavaScript asoslari") === "JavaScript asoslari", "Cleans '1. '");
    assert(cleanTopicLine("1 - JavaScript asoslari") === "JavaScript asoslari", "Cleans '1 - '");
    assert(cleanTopicLine("1) JavaScript asoslari") === "JavaScript asoslari", "Cleans '1) '");
    assert(cleanTopicLine("№ 1: JavaScript asoslari") === "JavaScript asoslari", "Cleans '№ 1: '");
    assert(cleanTopicLine("Dars 1: JavaScript asoslari") === "JavaScript asoslari", "Cleans 'Dars 1: '");
    assert(cleanTopicLine("1-dars. JavaScript asoslari") === "JavaScript asoslari", "Cleans '1-dars. '");
    assert(cleanTopicLine("Dars #10 - Backend API") === "Backend API", "Cleans 'Dars #10 - '");
  } catch (err: any) {
    console.error("Numbered lesson detection test error:", err);
    failed++;
  }

  // 3. DOCUMENT HEADER FILTERING TESTS
  try {
    const rawMultiPageDoc = `
0 DAN DASTURGACHA — 6 OYLIK TO‘LIQ DARS ISH REJASI
MUALLIF: SAMAR BADRIDDINOV
JAMI SOAT: 144 SOAT

№ | Dars mavzusi | Asosiy mazmun | Amaliy natija
1 | Kompyuter qanday ishlaydi? | Hardware, software, CPU, RAM | Kompyuter qismlarini aniqlash
2 | Windows Master | Desktop, Start, Taskbar | Papka va fayllar bilan ishlash

--- SAHIFA 2 / 4 ---
№ | Dars mavzusi | Asosiy mazmun | Amaliy natija
3 | Internet va raqamli xavfsizlik | Brauzerlar, parollar, 2FA | Xavfsiz profil sozlash
4 | Algoritm tushunchasi | Blok-sxemalar va ketma-ketlik | Choy damlash algoritmi

--- SAHIFA 3 / 4 ---
5 | HTML asoslari | Teglar, atributlar, matn | Birinchi web sahifa
    `;

    const parsedDoc = parseGenericDocumentText(rawMultiPageDoc);

    assert(parsedDoc.detectedTitle?.includes("0 DAN DASTURGACHA") || false, "Extracts course title from header");
    assert(parsedDoc.items.length === 5, `Extracts exactly 5 lesson items across pages (found ${parsedDoc.items.length})`);
    assert(parsedDoc.items[0].title === "Kompyuter qanday ishlaydi?", "First lesson title matches");
    assert(parsedDoc.items[2].title === "Internet va raqamli xavfsizlik", "Third lesson across page boundary matches");
    assert(!parsedDoc.items.some(i => i.title.includes("0 DAN DASTURGACHA")), "Document title is NOT added as a lesson row");
    assert(!parsedDoc.items.some(i => i.title.includes("SAHIFA")), "Page numbers are NOT added as lesson rows");
  } catch (err: any) {
    console.error("Document header filtering test error:", err);
    failed++;
  }

  // 4. EXACT 72-ROW CURRICULUM FIXTURE TEST
  try {
    let mock72Text = `0 DAN DASTURGACHA — 6 OYLIK TO‘LIQ DARS ISH REJASI\n`;
    for (let i = 1; i <= 72; i++) {
      if (i % 20 === 0) {
        mock72Text += `\n--- SAHIFA ${Math.floor(i / 20) + 1} ---\n№ | Dars mavzusi | Asosiy mazmun | Amaliy natija\n`;
      }
      mock72Text += `${i} — Dars mavzusi №${i} haqida\nAsosiy mazmun: Dars ${i} nazariyasi\nAmaliy natija: Amaliy mashg'ulot ${i}\nUyga vazifa: 1-topshiriq\n\n`;
    }

    const res72 = parseGenericDocumentText(mock72Text);
    assert(res72.items.length === 72, `Exactly 72 lesson items parsed from 72-lesson curriculum (got ${res72.items.length})`);
    assert(res72.items[0].orderNumber === 1 && res72.items[71].orderNumber === 72, "Order numbers span cleanly from 1 to 72");
    assert(res72.items[0].practice?.includes("Amaliy mashg'ulot 1") || false, "Practice metadata extracted cleanly");
  } catch (err: any) {
    console.error("72-row curriculum test error:", err);
    failed++;
  }

  // 5. CSV PARSING TESTS (Comma, Semicolon, Tab)
  try {
    const commaCsv = `№,Mavzu,Maqsad\n1,HTML Asoslari,Web sahifa yaratish\n2,CSS Stillari,Dizayn berish`;
    const parsedComma = parseCsvContent(commaCsv);
    assert(parsedComma.length === 2 && parsedComma[0].title === "HTML Asoslari", "Parses comma-separated CSV");

    const semiCsv = `№;Mavzu;Maqsad\n1;JavaScript Asoslari;Dasturlash\n2;DOM Bilan Ishlash;Interaktivlik`;
    const parsedSemi = parseCsvContent(semiCsv);
    assert(parsedSemi.length === 2 && parsedSemi[1].title === "DOM Bilan Ishlash", "Parses semicolon-separated CSV");

    const tabCsv = `№\tMavzu\tMaqsad\n1\tReact Asoslari\tKomponentlar\n2\tState va Props\tHolat boshqaruvi`;
    const parsedTab = parseCsvContent(tabCsv);
    assert(parsedTab.length === 2 && parsedTab[0].title === "React Asoslari", "Parses tab-separated CSV/TSV");
  } catch (err: any) {
    console.error("CSV test error:", err);
    failed++;
  }

  // 6. XLSX WORKBOOK PARSING TESTS
  try {
    const templateUint8 = generateCurriculumExcelTemplate();
    const templateBuffer = Buffer.from(templateUint8);

    const universalRes = await parseUniversalCurriculumFile({
      name: "namuna.xlsx",
      size: templateBuffer.length,
      buffer: templateBuffer,
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    assert(universalRes.success, "parseUniversalCurriculumFile succeeds for generated XLSX template");
    assert(universalRes.items.length === 3, "Generated XLSX has 3 valid items");
    assert(universalRes.items[0].status === "valid", "First item is valid");
  } catch (err: any) {
    console.error("XLSX parsing test error:", err);
    failed++;
  }

  // 7. DUPLICATE & WARNING NORMALIZATION TESTS
  try {
    const rawWithDuplicates: CurriculumImportRow[] = [
      { orderNumber: 1, title: "JavaScript Asoslari" },
      { orderNumber: 1, title: "JavaScript Asoslari" }, // Duplicate title and order
      { orderNumber: 2, title: "A".repeat(200) }, // Excessively long title
    ];

    const normalized = normalizeParsedRows(rawWithDuplicates);
    assert(normalized.length === 3, "Normalizes 3 items");
    assert(normalized[1].status === "warning", "Detects duplicate warning for 2nd item");
    assert(normalized[2].warnings.some(w => w.includes("juda uzun")), "Detects long title warning");
  } catch (err: any) {
    console.error("Normalization test error:", err);
    failed++;
  }

  console.log(`\n======================================================`);
  console.log(`Universal Importer Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runUniversalImporterTests().catch(console.error);
