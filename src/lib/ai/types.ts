import { z } from "zod";

// ============================================================================
// ZOD SCHEMAS FOR STRUCTURED AI OUTPUT
// ============================================================================

export const generatedOptionSchema = z.object({
  text: z.string().min(1, "Variant matni bo‘sh bo‘lishi mumkin emas").max(500),
  isCorrect: z.boolean(),
});

export const generatedQuestionSchema = z.object({
  question: z.string().min(3, "Savol matni kamida 3 ta belgidan iborat bo‘lishi kerak").max(1000),
  options: z.array(generatedOptionSchema).min(2).max(6),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  explanation: z.string().optional().default(""),
});

export const generatedAssignmentDraftSchema = z.object({
  title: z.string().min(2, "Topshiriq sarlavhasi bo‘sh bo‘lishi mumkin emas").max(200),
  description: z.string().optional().default(""),
  questions: z.array(generatedQuestionSchema).min(1, "Kamida 1 ta savol bo‘lishi kerak"),
});

// ============================================================================
// TYPES
// ============================================================================

export type GeneratedOption = z.infer<typeof generatedOptionSchema>;
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type GeneratedAssignmentDraft = z.infer<typeof generatedAssignmentDraftSchema>;

export type AISourceType = "topic" | "crm_lesson" | "text";

export type QuestionDifficulty = "Oson" | "O‘rtacha" | "Qiyin" | "Aralash";

export type QuestionStyle = "Nazariy" | "Amaliy" | "Kodli" | "Mantiqiy" | "Aralash";

export interface AIGeneratorSource {
  type: AISourceType;
  topic?: string;
  instruction?: string;
  lessonId?: string;
  lessonContext?: {
    courseName?: string;
    groupName?: string;
    topic: string;
    description?: string;
    homework?: string;
  };
  textMaterial?: string;
}

export interface AIGeneratorSettings {
  groupId: string;
  questionCount: number; // 3 - 30, default 10
  difficulty: QuestionDifficulty; // Default "O‘rtacha"
  optionCount: number; // 3, 4, 5, default 4
  styles: QuestionStyle[]; // e.g. ["Nazariy", "Amaliy", "Kodli"]
}

export interface AIProviderConfig {
  provider: "gemini" | "openai" | "custom";
  apiKey: string | null;
  model: string;
  isConfigured: boolean;
}
