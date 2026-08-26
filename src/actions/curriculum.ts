"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CurriculumFormData,
  CurriculumItemFormData,
  CurriculumImportRow,
  CurriculumStatus,
  curriculumFormSchema,
  curriculumItemFormSchema,
} from "@/types/curriculum";
import {
  getCurricula,
  getCurriculumById,
  getCurriculumItems,
  getCurriculumItemById,
  getCurriculumProgress,
  createCurriculum,
  updateCurriculum,
  deleteCurriculum,
  createCurriculumItem,
  updateCurriculumItem,
  deleteCurriculumItem,
  bulkImportCurriculumItems,
  duplicateCurriculum,
  reorderCurriculumItems,
  getNextCurriculumTopic,
} from "@/services/curriculum";
import { callAIProvider } from "@/lib/ai/provider";

/**
 * Verify Admin Authorization
 */
async function verifyAdmin(): Promise<boolean> {
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

export async function getNextCurriculumTopicAction(groupId?: string) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, data: null };

  try {
    const topic = await getNextCurriculumTopic(groupId);
    return { success: true, data: topic };
  } catch (err: any) {
    return { success: false, data: null, error: err.message };
  }
}

export async function getCurriculaAction(filter?: {
  groupId?: string;
  status?: CurriculumStatus;
}) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  try {
    const list = await getCurricula(filter);
    return { success: true, data: list };
  } catch (err: any) {
    return { success: false, error: err.message || "Xatolik yuz berdi." };
  }
}

export async function getCurriculumByIdAction(id: string) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  try {
    const item = await getCurriculumById(id);
    if (!item) return { success: false, error: "Ish reja topilmadi." };
    const progress = await getCurriculumProgress(id);
    return { success: true, data: item, progress };
  } catch (err: any) {
    return { success: false, error: err.message || "Xatolik yuz berdi." };
  }
}

export async function getCurriculumItemsAction(
  curriculumId: string,
  filter?: { status?: string; search?: string }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  try {
    const items = await getCurriculumItems(curriculumId, filter);
    return { success: true, data: items };
  } catch (err: any) {
    return { success: false, error: err.message || "Xatolik yuz berdi." };
  }
}

export async function getCurriculumItemByIdAction(id: string) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  try {
    const item = await getCurriculumItemById(id);
    if (!item) return { success: false, error: "Mavzu topilmadi." };
    return { success: true, data: item };
  } catch (err: any) {
    return { success: false, error: err.message || "Xatolik yuz berdi." };
  }
}

export async function createCurriculumAction(data: CurriculumFormData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  const parsed = curriculumFormSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Noto‘g‘ri ma'lumotlar" };
  }

  try {
    const id = await createCurriculum(data);
    revalidatePath("/curriculum");
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: err.message || "Ish rejani saqlashda xatolik." };
  }
}

export async function updateCurriculumAction(id: string, data: Partial<CurriculumFormData>) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  try {
    await updateCurriculum(id, data);
    revalidatePath("/curriculum");
    revalidatePath(`/curriculum/${id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Yangilashda xatolik." };
  }
}

export async function deleteCurriculumAction(id: string) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  try {
    await deleteCurriculum(id);
    revalidatePath("/curriculum");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "O‘chirishda xatolik." };
  }
}

export async function createCurriculumItemAction(
  curriculumId: string,
  data: CurriculumItemFormData
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  const parsed = curriculumItemFormSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Noto‘g‘ri ma'lumotlar" };
  }

  try {
    const id = await createCurriculumItem(curriculumId, data);
    revalidatePath(`/curriculum/${curriculumId}`);
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: err.message || "Mavzuni saqlashda xatolik." };
  }
}

export async function updateCurriculumItemAction(
  id: string,
  curriculumId: string,
  data: Partial<CurriculumItemFormData>
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  try {
    await updateCurriculumItem(id, data);
    revalidatePath(`/curriculum/${curriculumId}`);
    revalidatePath(`/curriculum/${curriculumId}/items/${id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Mavzuni yangilashda xatolik." };
  }
}

export async function deleteCurriculumItemAction(id: string, curriculumId: string) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  try {
    await deleteCurriculumItem(id);
    revalidatePath(`/curriculum/${curriculumId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Mavzuni o‘chirishda xatolik." };
  }
}

export async function bulkImportCurriculumItemsAction(
  curriculumId: string,
  rows: CurriculumImportRow[]
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  if (!rows || rows.length === 0) {
    return { success: false, error: "Import qilish uchun mavzular topilmadi." };
  }

  try {
    const count = await bulkImportCurriculumItems(curriculumId, rows);
    revalidatePath(`/curriculum/${curriculumId}`);
    return { success: true, count };
  } catch (err: any) {
    return { success: false, error: err.message || "Import qilishda xatolik yuz berdi." };
  }
}

export async function duplicateCurriculumAction(
  curriculumId: string,
  targetGroupId?: string,
  customName?: string
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  try {
    const newId = await duplicateCurriculum(curriculumId, targetGroupId, customName);
    revalidatePath("/curriculum");
    return { success: true, id: newId };
  } catch (err: any) {
    return { success: false, error: err.message || "Nusxa olishda xatolik yuz berdi." };
  }
}

export async function reorderCurriculumItemsAction(
  curriculumId: string,
  itemIdsInOrder: string[]
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  try {
    await reorderCurriculumItems(curriculumId, itemIdsInOrder);
    revalidatePath(`/curriculum/${curriculumId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Tartibni saqlashda xatolik." };
  }
}

/**
 * AI Curriculum Topic Enrichment (Optional feature)
 * Enriches a simple topic with objective, practice, description, and homework plan.
 */
export async function enrichCurriculumTopicWithAIAction(
  topicTitle: string,
  courseContext?: string
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  const prompt = `KURS / FAN: ${courseContext || "Dasturlash"}
MAVZU: ${topicTitle}

VAZIFA:
Ushbu dars mavzusi uchun o‘quv rejasi detallarini tuzing (O‘zbek tilida, lotin alifbosida).

KUTILAYOTGAN JSON FORMAT:
{
  "objective": "Darsning asosiy maqsadi (1-2 gap)",
  "description": "Darsning qisqacha mazmuni va nazariyasi",
  "practice": "Dars davomida qilinadigan amaliy mashg‘ulotlar (punktlar bo‘yicha)",
  "homeworkPlan": "O‘quvchiga beriladigan mustaqil uyga vazifa",
  "durationMinutes": 90
}`;

  try {
    const raw = await callAIProvider({
      systemPrompt: "Siz ta'lim metodisti va o‘quv dasturlari bo‘yicha mutaxassissiz. Faqat toza JSON qaytaring.",
      userPrompt: prompt,
      temperature: 0.3,
      jsonMode: true,
    });

    let cleaned = raw.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const data = JSON.parse(cleaned);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "AI tahlil qilishda xatolik." };
  }
}

/**
 * Create an actual Lesson from a Curriculum Item
 */
export async function createLessonFromCurriculumItemAction(
  itemId: string,
  groupId: string,
  date: string,
  startTime: string = "09:00",
  endTime: string = "10:30"
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Ruxsat berilmagan." };

  try {
    const item = await getCurriculumItemById(itemId);
    if (!item) return { success: false, error: "Mavzu topilmadi." };

    const supabase = createAdminClient();

    // 1. Create Lesson
    const { data: lesson, error: lErr } = await supabase
      .from("lessons")
      .insert({
        group_id: groupId,
        curriculum_item_id: itemId,
        date,
        start_time: startTime,
        end_time: endTime,
        topic: item.title,
        description: [item.objective, item.description, item.practice]
          .filter(Boolean)
          .join("\n\n") || null,
        homework: item.homework_plan || null,
        status: "Rejalashtirilgan",
      })
      .select("id")
      .single();

    if (lErr || !lesson) {
      return { success: false, error: lErr?.message || "Dars yaratishda xatolik." };
    }

    // 2. Mark Curriculum Item as O‘tilgan
    await supabase
      .from("curriculum_items")
      .update({ status: "O‘tilgan", updated_at: new Date().toISOString() })
      .eq("id", itemId);

    revalidatePath("/lessons");
    revalidatePath(`/curriculum/${item.curriculum_id}`);
    revalidatePath(`/curriculum/${item.curriculum_id}/items/${itemId}`);
    revalidatePath("/dashboard");

    return { success: true, lessonId: lesson.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Dars yaratishda xatolik yuz berdi." };
  }
}
