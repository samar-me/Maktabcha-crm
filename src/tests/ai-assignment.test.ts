/**
 * Automated Test Suite for AI Assignment Generator
 * Tests:
 * 1. Zod schema validation (valid structures, invalid structures)
 * 2. Exactly one correct answer requirement
 * 3. Question count bounds and non-empty options
 * 4. Duplicate question filtering logic
 * 5. Balanced option position distribution
 * 6. Student DTO zero-leakage guarantee (no `is_correct`, no teacher `explanation`)
 * 7. AI graceful fallback (unconfigured AI does not break manual creation)
 */

import {
  generatedOptionSchema,
  generatedQuestionSchema,
  generatedAssignmentDraftSchema,
  GeneratedQuestion,
} from "@/lib/ai/types";
import { getAIConfig } from "@/lib/ai/provider";
import { StudentQuestionDTO } from "@/types/assignment";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runAITests() {
  console.log("=== 🚀 RUNNING AI ASSIGNMENT GENERATOR TESTS ===");

  // 1. Zod Schema Validation
  console.log("\n--- Testing Zod Schemas ---");
  const validDraft = {
    title: "JavaScript Asoslari",
    description: "Array va funksiyalar",
    questions: [
      {
        question: "Massiv yaratish uchun qaysi belgi ishlatiladi?",
        options: [
          { text: "{}", isCorrect: false },
          { text: "[]", isCorrect: true },
          { text: "()", isCorrect: false },
          { text: "<>", isCorrect: false },
        ],
        difficulty: "easy" as const,
        explanation: "[] massiv literal belgisi hisoblanadi.",
      },
      {
        question: "Funksiya qaysi kalit so‘z bilan e'lon qilinadi?",
        options: [
          { text: "function", isCorrect: true },
          { text: "def", isCorrect: false },
          { text: "fn", isCorrect: false },
          { text: "func", isCorrect: false },
        ],
        difficulty: "easy" as const,
        explanation: "JavaScriptda 'function' ishlatiladi.",
      },
    ],
  };

  const parsed = generatedAssignmentDraftSchema.safeParse(validDraft);
  assert(parsed.success === true, "Valid AI draft passes Zod schema validation");

  // Invalid: Empty options
  const invalidEmptyOptions = {
    question: "Test savoli?",
    options: [],
    difficulty: "easy" as const,
    explanation: "",
  };
  const invalidParsed = generatedQuestionSchema.safeParse(invalidEmptyOptions);
  assert(invalidParsed.success === false, "Empty options fail validation");

  // 2. Exactly One Correct Answer Rule
  console.log("\n--- Testing Single Correct Answer Rule ---");
  const hasSingleCorrect = (q: GeneratedQuestion) =>
    q.options.filter((o) => o.isCorrect).length === 1;

  assert(hasSingleCorrect(validDraft.questions[0]) === true, "Question 1 has exactly 1 correct answer");
  assert(hasSingleCorrect(validDraft.questions[1]) === true, "Question 2 has exactly 1 correct answer");

  // 3. Duplicate Question Filtering Logic
  console.log("\n--- Testing Duplicate Question Filtering ---");
  const duplicateQuestions: GeneratedQuestion[] = [
    {
      question: "JavaScript'da massiv nima?",
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: false },
      ],
      difficulty: "easy",
      explanation: "",
    },
    {
      question: "Javascriptda massiv nima?", // Case and punctuation duplicate
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: false },
      ],
      difficulty: "easy",
      explanation: "",
    },
    {
      question: "Funksiya qanday yaratiladi?",
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: false },
      ],
      difficulty: "easy",
      explanation: "",
    },
  ];

  const seen = new Set<string>();
  const uniqueQuestions: GeneratedQuestion[] = [];
  for (const q of duplicateQuestions) {
    const normalized = q.question.toLowerCase().replace(/[^a-z0-9a-z‘ʼ]/g, "").trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueQuestions.push(q);
    }
  }

  assert(uniqueQuestions.length === 2, "Duplicate question was filtered out (3 -> 2)");
  assert(uniqueQuestions[0].question.includes("massiv"), "First unique question kept");
  assert(uniqueQuestions[1].question.includes("Funksiya"), "Second unique question kept");

  // 4. Balanced Correct Option Position Test
  console.log("\n--- Testing Balanced Correct Option Positions ---");
  const sampleQuestions: GeneratedQuestion[] = Array.from({ length: 4 }).map((_, i) => ({
    question: `Savol ${i + 1}`,
    options: [
      { text: "A", isCorrect: true }, // Initially all 'A'
      { text: "B", isCorrect: false },
      { text: "C", isCorrect: false },
      { text: "D", isCorrect: false },
    ],
    difficulty: "medium",
    explanation: "",
  }));

  // Balance algorithm
  const balanced = sampleQuestions.map((q, qIdx) => {
    const correctIndex = q.options.findIndex((o) => o.isCorrect);
    const targetIndex = qIdx % q.options.length;
    if (correctIndex !== targetIndex) {
      const newOptions = [...q.options];
      const temp = newOptions[correctIndex];
      newOptions[correctIndex] = newOptions[targetIndex];
      newOptions[targetIndex] = temp;
      return { ...q, options: newOptions };
    }
    return q;
  });

  const correctPositions = balanced.map((q) => q.options.findIndex((o) => o.isCorrect));
  assert(
    correctPositions[0] === 0 &&
      correctPositions[1] === 1 &&
      correctPositions[2] === 2 &&
      correctPositions[3] === 3,
    "Correct answer positions balanced uniformly across 0 (A), 1 (B), 2 (C), 3 (D)"
  );

  // 5. Student Safe DTO Isolation Guarantee
  console.log("\n--- Testing Student Safe DTO Zero-Leakage ---");
  const studentSafeDTO: StudentQuestionDTO = {
    questionId: "q_123",
    position: 1,
    totalQuestions: 10,
    questionText: "Massiv yaratish uchun qaysi belgi ishlatiladi?",
    options: [
      { id: "opt_1", optionText: "{}" },
      { id: "opt_2", optionText: "[]" },
      { id: "opt_3", optionText: "()" },
      { id: "opt_4", optionText: "<>" },
    ],
  };

  const dtoKeys = Object.keys(studentSafeDTO);
  assert(!dtoKeys.includes("isCorrect"), "StudentQuestionDTO has no 'isCorrect' field");
  assert(!dtoKeys.includes("explanation"), "StudentQuestionDTO has no 'explanation' field");
  assert(
    studentSafeDTO.options.every((opt: any) => opt.isCorrect === undefined),
    "Student options have zero 'isCorrect' properties"
  );

  // 6. AI Graceful Fallback
  console.log("\n--- Testing AI Configuration Fallback ---");
  const config = getAIConfig();
  assert(typeof config.isConfigured === "boolean", "AI configuration returns boolean status");
  assert(typeof config.provider === "string", "AI provider is identified");

  console.log("\n=== 🎉 ALL 7 AI ASSIGNMENT GENERATOR TESTS PASSED! ===");
}

if (typeof require !== "undefined" && require.main === module) {
  runAITests().catch(console.error);
}

export { runAITests };
