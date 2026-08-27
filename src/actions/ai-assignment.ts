"use server";

export const maxDuration = 60; // Allow up to 60 seconds for AI generation (Vercel Pro/Hobby fallback)

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AIGeneratorSource,
  AIGeneratorSettings,
  GeneratedAssignmentDraft,
  GeneratedQuestion,
} from "@/lib/ai/types";
import {
  generateAssignmentDraft,
  regenerateSingleQuestion,
  improveSingleQuestion,
} from "@/lib/ai/assignment-generator";
import { getAIConfig } from "@/lib/ai/provider";

/**
 * Verify that the current user is an authenticated Admin
 */
async function verifyAdminAuth(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return Boolean(user && user.email);
  } catch {
    return false;
  }
}

/**
 * Check if AI service is configured on server
 */
export async function getAIAvailabilityAction() {
  const config = getAIConfig();
  return {
    isConfigured: config.isConfigured,
    provider: config.provider,
    model: config.model,
  };
}

/**
 * Load safe lesson educational context without any student PII
 */
export async function getLessonContextForAIAction(lessonId: string) {
  const isAdmin = await verifyAdminAuth();
  if (!isAdmin) {
    return { success: false, error: "Ruxsat berilmagan." };
  }

  try {
    const supabase = createAdminClient();
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("id, topic, description, homework, groups(name, course_name)")
      .eq("id", lessonId)
      .maybeSingle();

    if (error || !lesson) {
      return { success: false, error: "Dars topilmadi." };
    }

    const group = (lesson as any).groups;

    return {
      success: true,
      context: {
        topic: (lesson as any).topic || "Dars",
        description: (lesson as any).description || "",
        homework: (lesson as any).homework || "",
        groupName: group?.name || "",
        courseName: group?.course_name || "",
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Dars ma'lumotlarini yuklashda xatolik." };
  }
}

/**
 * Load safe curriculum topic context without any student PII
 */
export async function getCurriculumContextForAIAction(itemId: string) {
  const isAdmin = await verifyAdminAuth();
  if (!isAdmin) {
    return { success: false, error: "Ruxsat berilmagan." };
  }

  try {
    const supabase = createAdminClient();
    const { data: item, error } = await supabase
      .from("curriculum_items")
      .select("id, title, objective, description, practice, homework_plan, category, curricula(course_name, name)")
      .eq("id", itemId)
      .maybeSingle();

    if (error || !item) {
      return { success: false, error: "Mavzu topilmadi." };
    }

    const curr = (item as any).curricula;

    return {
      success: true,
      context: {
        title: item.title,
        objective: item.objective || "",
        description: item.description || "",
        practice: item.practice || "",
        homeworkPlan: item.homework_plan || "",
        courseName: curr?.course_name || curr?.name || "",
        category: item.category || "",
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Mavzu ma'lumotlarini yuklashda xatolik." };
  }
}

/**
 * Generate complete assignment draft with AI
 */
export async function generateAssignmentWithAIAction(
  source: AIGeneratorSource,
  settings: AIGeneratorSettings
): Promise<{ success: boolean; data?: GeneratedAssignmentDraft; error?: string }> {
  const isAdmin = await verifyAdminAuth();
  if (!isAdmin) {
    return {
      success: false,
      error: "Ruxsat berilmagan. Faqat o‘qituvchi/administrator AI orqali topshiriq yarata oladi.",
    };
  }

  // Load lesson context securely on server if CRM lesson was selected
  if (source.type === "crm_lesson" && source.lessonId && !source.lessonContext) {
    const lessonRes = await getLessonContextForAIAction(source.lessonId);
    if (lessonRes.success && lessonRes.context) {
      source.lessonContext = lessonRes.context;
    }
  }

  // Load curriculum item context securely on server if curriculum source was selected
  if (source.type === "curriculum" && source.curriculumItemId && !source.curriculumContext) {
    const currRes = await getCurriculumContextForAIAction(source.curriculumItemId);
    if (currRes.success && currRes.context) {
      source.curriculumContext = currRes.context;
    }
  }

  try {
    const draft = await generateAssignmentDraft(source, settings);
    return { success: true, data: draft };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "AI topshiriq yaratishda kutilmagan xatolik yuz berdi.",
    };
  }
}

/**
 * Regenerate a single question with AI
 */
export async function regenerateQuestionWithAIAction(
  source: AIGeneratorSource,
  settings: AIGeneratorSettings,
  existingQuestions: Array<{ question: string }>,
  questionToReplace: string
): Promise<{ success: boolean; data?: GeneratedQuestion; error?: string }> {
  const isAdmin = await verifyAdminAuth();
  if (!isAdmin) {
    return { success: false, error: "Ruxsat berilmagan." };
  }

  try {
    const question = await regenerateSingleQuestion(
      source,
      settings,
      existingQuestions,
      questionToReplace
    );
    return { success: true, data: question };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Savolni almashtirishda xatolik yuz berdi.",
    };
  }
}

/**
 * Improve a single question with custom teacher instruction
 */
export async function improveQuestionWithAIAction(
  source: AIGeneratorSource,
  currentQuestion: GeneratedQuestion,
  instruction: string
): Promise<{ success: boolean; data?: GeneratedQuestion; error?: string }> {
  const isAdmin = await verifyAdminAuth();
  if (!isAdmin) {
    return { success: false, error: "Ruxsat berilmagan." };
  }

  if (!instruction.trim()) {
    return { success: false, error: "Iltimos, yaxshilash bo‘yicha ko‘rsatma yozing." };
  }

  try {
    const question = await improveSingleQuestion(source, currentQuestion, instruction.trim());
    return { success: true, data: question };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Savolni yaxshilashda xatolik yuz berdi.",
    };
  }
}
