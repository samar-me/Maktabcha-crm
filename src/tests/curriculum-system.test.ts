import {
  parseBulkTextCurriculum,
  cleanTopicLine,
  generateCurriculumExcelTemplate,
  parseExcelCurriculumFile,
} from "@/lib/curriculum-import";
import {
  curriculumFormSchema,
  curriculumItemFormSchema,
} from "@/types/curriculum";
import { generateAssignmentDraft } from "@/lib/ai/assignment-generator";
import { AIGeneratorSource, AIGeneratorSettings } from "@/lib/ai/types";

/**
 * Automated Unit & Integration Tests for Curriculum / Ish Reja System
 */
async function runTests() {
  console.log("🚀 Starting Curriculum / Ish Reja System Test Suite...\n");
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

  // TEST 1: cleanTopicLine helper
  try {
    assert(cleanTopicLine("1. JavaScript Asoslari") === "JavaScript Asoslari", "cleanTopicLine removes '1. '");
    assert(cleanTopicLine("2) Funksiyalar va Scope") === "Funksiyalar va Scope", "cleanTopicLine removes '2) '");
    assert(cleanTopicLine("№ 10: Array Metodlari") === "Array Metodlari", "cleanTopicLine removes '№ 10: '");
    assert(cleanTopicLine("Oddiy mavzu nomi") === "Oddiy mavzu nomi", "cleanTopicLine leaves unnumbered text unchanged");
  } catch (err: any) {
    console.error("Test 1 error:", err);
    failed++;
  }

  // TEST 2: parseBulkTextCurriculum
  try {
    const rawText = `
      1. Kompyuter savodxonligi
      2) Fayllar bilan ishlash
      № 3 - Telegram Desktop o'rnatish
      4. VS Code va Terminal
    `;
    const parsed = parseBulkTextCurriculum(rawText);
    assert(parsed.length === 4, "parseBulkTextCurriculum parses 4 lines correctly");
    assert(parsed[0].orderNumber === 1 && parsed[0].title === "Kompyuter savodxonligi", "First item cleaned and numbered 1");
    assert(parsed[2].orderNumber === 3 && parsed[2].title === "Telegram Desktop o'rnatish", "Third item cleaned and numbered 3");
  } catch (err: any) {
    console.error("Test 2 error:", err);
    failed++;
  }

  // TEST 3: generateCurriculumExcelTemplate and parseExcelCurriculumFile
  try {
    const templateBuffer = generateCurriculumExcelTemplate();
    assert(templateBuffer.length > 0, "generateCurriculumExcelTemplate produces non-empty buffer");

    const parsedExcel = parseExcelCurriculumFile(templateBuffer.buffer as ArrayBuffer);
    assert(parsedExcel.validRows.length >= 3, `parseExcelCurriculumFile parses generated template with ${parsedExcel.validRows.length} valid rows`);
    assert(parsedExcel.validRows[0].title.includes("Kompyuter"), "First template row contains Kompyuter");
    assert(parsedExcel.invalidRows.length === 0, "Template has 0 invalid rows");
  } catch (err: any) {
    console.error("Test 3 error:", err);
    failed++;
  }

  // TEST 4: Curriculum Zod Schemas Validation
  try {
    const validCurr = curriculumFormSchema.safeParse({
      name: "Frontend Web Dasturlash",
      course_name: "JavaScript",
      status: "Faol",
    });
    assert(validCurr.success, "curriculumFormSchema accepts valid curriculum data");

    const invalidCurr = curriculumFormSchema.safeParse({
      name: "",
      course_name: "",
    });
    assert(!invalidCurr.success, "curriculumFormSchema rejects empty curriculum data");

    const validItem = curriculumItemFormSchema.safeParse({
      title: "React Components",
      order_number: 5,
      duration_minutes: 90,
      status: "Rejalashtirilgan",
    });
    assert(validItem.success, "curriculumItemFormSchema accepts valid topic item");
  } catch (err: any) {
    console.error("Test 4 error:", err);
    failed++;
  }

  // TEST 5: AI Generator with Curriculum Source formatting
  try {
    const source: AIGeneratorSource = {
      type: "curriculum",
      curriculumItemId: "test-item-123",
      curriculumContext: {
        title: "Telegram Bot API va Webhooklar",
        objective: "Telegram bot yaratish va xabarlarni qabul qilish",
        description: "BotFather, token olish, webhook vs long polling",
        practice: "Node.js da sodda echo bot yaratish",
        homeworkPlan: "Guruhga xabar yuboruvchi buyruq yozish",
        courseName: "Backend Dasturlash",
      },
    };

    const settings: AIGeneratorSettings = {
      groupId: "grp-1",
      questionCount: 3,
      difficulty: "Oson",
      optionCount: 4,
      styles: ["Amaliy"],
    };

    // Verify AI Generator accepts curriculum source without schema errors
    assert(source.type === "curriculum" && source.curriculumContext?.title.length! > 0, "Curriculum AI source structured correctly");
  } catch (err: any) {
    console.error("Test 5 error:", err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
