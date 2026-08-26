import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Curriculum,
  CurriculumItem,
  CurriculumProgress,
  CurriculumFormData,
  CurriculumItemFormData,
  CurriculumImportRow,
  CurriculumStatus,
} from "@/types/curriculum";

/**
 * Get all curricula with joined group and calculated item counts
 */
export async function getCurricula(filter?: {
  groupId?: string;
  status?: CurriculumStatus;
}): Promise<Curriculum[]> {
  const supabase = await createClient();

  let query = supabase
    .from("curricula")
    .select("*, groups(id, name, course_name), curriculum_items(id, status)")
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }
  if (filter?.groupId) {
    query = query.eq("group_id", filter.groupId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getCurricula error:", error);
    return [];
  }

  return (data || []).map((c: any) => {
    const items = c.curriculum_items || [];
    const total = items.length;
    const completed = items.filter((i: any) => i.status === "O‘tilgan").length;

    return {
      id: c.id,
      name: c.name,
      description: c.description,
      course_name: c.course_name,
      group_id: c.group_id,
      status: c.status,
      academic_period: c.academic_period,
      created_at: c.created_at,
      updated_at: c.updated_at,
      groups: c.groups,
      items_count: total,
      completed_count: completed,
    };
  });
}

/**
 * Get a single curriculum by ID
 */
export async function getCurriculumById(id: string): Promise<Curriculum | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("curricula")
    .select("*, groups(id, name, course_name), curriculum_items(id, status)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const curr = data as any;
  const items = curr.curriculum_items || [];
  const total = items.length;
  const completed = items.filter((i: any) => i.status === "O‘tilgan").length;

  return {
    id: curr.id,
    name: curr.name,
    description: curr.description,
    course_name: curr.course_name,
    group_id: curr.group_id,
    status: curr.status,
    academic_period: curr.academic_period,
    created_at: curr.created_at,
    updated_at: curr.updated_at,
    groups: curr.groups,
    items_count: total,
    completed_count: completed,
  };
}

/**
 * Get items for a curriculum with linked lesson and assignment counts
 */
export async function getCurriculumItems(
  curriculumId: string,
  filter?: { status?: string; search?: string }
): Promise<CurriculumItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("curriculum_items")
    .select("*, lessons(id, topic, date, status), assignments(id)")
    .eq("curriculum_id", curriculumId)
    .order("order_number", { ascending: true });

  if (filter?.status && filter.status !== "Barchasi") {
    query = query.eq("status", filter.status);
  }
  if (filter?.search) {
    query = query.ilike("title", `%${filter.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getCurriculumItems error:", error);
    return [];
  }

  return (data || []).map((item: any) => {
    const linkedLessons = item.lessons || [];
    const firstLesson = linkedLessons.length > 0 ? linkedLessons[0] : null;
    const assignmentsCount = (item.assignments || []).length;

    return {
      id: item.id,
      curriculum_id: item.curriculum_id,
      order_number: item.order_number,
      title: item.title,
      description: item.description,
      objective: item.objective,
      practice: item.practice,
      homework_plan: item.homework_plan,
      duration_minutes: item.duration_minutes || 90,
      category: item.category,
      planned_date: item.planned_date,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
      linked_lesson: firstLesson
        ? {
            id: firstLesson.id,
            topic: firstLesson.topic,
            date: firstLesson.date,
            status: firstLesson.status,
          }
        : null,
      assignments_count: assignmentsCount,
    };
  });
}

/**
 * Get a single curriculum item by ID
 */
export async function getCurriculumItemById(id: string): Promise<CurriculumItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("curriculum_items")
    .select("*, lessons(id, topic, date, status), assignments(id, title, status, public_token)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const itm = data as any;
  const linkedLessons = itm.lessons || [];
  const firstLesson = linkedLessons.length > 0 ? linkedLessons[0] : null;

  return {
    id: itm.id,
    curriculum_id: itm.curriculum_id,
    order_number: itm.order_number,
    title: itm.title,
    description: itm.description,
    objective: itm.objective,
    practice: itm.practice,
    homework_plan: itm.homework_plan,
    duration_minutes: itm.duration_minutes || 90,
    category: itm.category,
    planned_date: itm.planned_date,
    status: itm.status,
    created_at: itm.created_at,
    updated_at: itm.updated_at,
    linked_lesson: firstLesson
      ? {
          id: firstLesson.id,
          topic: firstLesson.topic,
          date: firstLesson.date,
          status: firstLesson.status,
        }
      : null,
    assignments_count: (itm.assignments || []).length,
  };
}

/**
 * Calculate curriculum progress
 */
export async function getCurriculumProgress(
  curriculumId: string
): Promise<CurriculumProgress> {
  const items = await getCurriculumItems(curriculumId);
  const total = items.length;
  const completed = items.filter((i) => i.status === "O‘tilgan").length;
  const skipped = items.filter((i) => i.status === "O‘tkazib yuborilgan").length;
  const remaining = total - completed - skipped;
  const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    totalItems: total,
    completedItems: completed,
    remainingItems: Math.max(0, remaining),
    skippedItems: skipped,
    progressPercentage,
  };
}

/**
 * Get next upcoming curriculum topic for Dashboard / Quick actions
 */
export async function getNextCurriculumTopic(groupId?: string): Promise<{
  item: CurriculumItem;
  curriculum: Curriculum;
} | null> {
  const supabase = await createClient();

  let cQuery = supabase.from("curricula").select("*, groups(id, name, course_name)").eq("status", "Faol");
  if (groupId) {
    cQuery = cQuery.eq("group_id", groupId);
  }

  const { data: curricula, error: cErr } = await cQuery.limit(1);
  if (cErr || !curricula || curricula.length === 0) return null;

  const curriculum: any = curricula[0];

  // Find today's planned item first, or first non-completed item
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: todayItem } = await (supabase.from("curriculum_items") as any)
    .select("*, lessons(id, topic, date, status)")
    .eq("curriculum_id", curriculum.id)
    .eq("planned_date", todayStr)
    .neq("status", "O‘tilgan")
    .maybeSingle();

  if (todayItem) {
    return {
      item: todayItem as any,
      curriculum: curriculum as any,
    };
  }

  // Fallback to first non-completed item by order_number
  const { data: nextItem } = await (supabase.from("curriculum_items") as any)
    .select("*, lessons(id, topic, date, status)")
    .eq("curriculum_id", curriculum.id)
    .neq("status", "O‘tilgan")
    .neq("status", "O‘tkazib yuborilgan")
    .order("order_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextItem) {
    return {
      item: nextItem as any,
      curriculum: curriculum as any,
    };
  }

  return null;
}

/**
 * Create a new Curriculum
 */
export async function createCurriculum(data: CurriculumFormData): Promise<string> {
  const supabase = createAdminClient();

  const { data: created, error } = await supabase
    .from("curricula")
    .insert({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      course_name: data.course_name.trim(),
      group_id: data.group_id || null,
      academic_period: data.academic_period?.trim() || null,
      status: data.status || "Faol",
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message || "Ish rejani saqlashda xatolik yuz berdi");
  }

  return created.id;
}

/**
 * Update Curriculum
 */
export async function updateCurriculum(
  id: string,
  data: Partial<CurriculumFormData>
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("curricula")
    .update({
      ...(data.name && { name: data.name.trim() }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.course_name && { course_name: data.course_name.trim() }),
      ...(data.group_id !== undefined && { group_id: data.group_id || null }),
      ...(data.academic_period !== undefined && { academic_period: data.academic_period?.trim() || null }),
      ...(data.status && { status: data.status }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Ish rejani yangilashda xatolik yuz berdi");
  }
}

/**
 * Delete Curriculum
 */
export async function deleteCurriculum(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("curricula").delete().eq("id", id);
  if (error) {
    throw new Error(error.message || "Ish rejani o‘chirishda xatolik");
  }
}

/**
 * Create a single Curriculum Item
 */
export async function createCurriculumItem(
  curriculumId: string,
  data: CurriculumItemFormData
): Promise<string> {
  const supabase = createAdminClient();

  // Determine order number
  let orderNumber = data.order_number;
  if (!orderNumber) {
    const { data: lastItem } = await supabase
      .from("curriculum_items")
      .select("order_number")
      .eq("curriculum_id", curriculumId)
      .order("order_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    orderNumber = (lastItem?.order_number || 0) + 1;
  } else {
    // If inserting at existing orderNumber, shift later items
    const { data: existing } = await supabase
      .from("curriculum_items")
      .select("id")
      .eq("curriculum_id", curriculumId)
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (existing) {
      // Shift later items by +1000 temporarily to avoid unique collision, then back
      const { data: allItems } = await supabase
        .from("curriculum_items")
        .select("id, order_number")
        .eq("curriculum_id", curriculumId)
        .gte("order_number", orderNumber)
        .order("order_number", { ascending: false });

      if (allItems && allItems.length > 0) {
        for (const it of allItems) {
          await supabase
            .from("curriculum_items")
            .update({ order_number: it.order_number + 1 })
            .eq("id", it.id);
        }
      }
    }
  }

  const { data: created, error } = await supabase
    .from("curriculum_items")
    .insert({
      curriculum_id: curriculumId,
      order_number: orderNumber,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      objective: data.objective?.trim() || null,
      practice: data.practice?.trim() || null,
      homework_plan: data.homework_plan?.trim() || null,
      duration_minutes: data.duration_minutes || 90,
      category: data.category?.trim() || null,
      planned_date: data.planned_date || null,
      status: data.status || "Rejalashtirilgan",
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message || "Mavzuni saqlashda xatolik yuz berdi");
  }

  return created.id;
}

/**
 * Update Curriculum Item
 */
export async function updateCurriculumItem(
  id: string,
  data: Partial<CurriculumItemFormData>
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("curriculum_items")
    .update({
      ...(data.title && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.objective !== undefined && { objective: data.objective?.trim() || null }),
      ...(data.practice !== undefined && { practice: data.practice?.trim() || null }),
      ...(data.homework_plan !== undefined && { homework_plan: data.homework_plan?.trim() || null }),
      ...(data.duration_minutes !== undefined && { duration_minutes: data.duration_minutes }),
      ...(data.category !== undefined && { category: data.category?.trim() || null }),
      ...(data.planned_date !== undefined && { planned_date: data.planned_date || null }),
      ...(data.status && { status: data.status }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Mavzuni yangilashda xatolik");
  }
}

/**
 * Delete Curriculum Item and re-compact order numbers
 */
export async function deleteCurriculumItem(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: item } = await supabase
    .from("curriculum_items")
    .select("curriculum_id, order_number")
    .eq("id", id)
    .single();

  if (!item) return;

  await supabase.from("curriculum_items").delete().eq("id", id);

  // Compact remaining order numbers
  const { data: remaining } = await supabase
    .from("curriculum_items")
    .select("id")
    .eq("curriculum_id", item.curriculum_id)
    .order("order_number", { ascending: true });

  if (remaining && remaining.length > 0) {
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from("curriculum_items")
        .update({ order_number: i + 1 })
        .eq("id", remaining[i].id);
    }
  }
}

/**
 * Bulk Import Curriculum Items (from Excel or Text)
 */
export async function bulkImportCurriculumItems(
  curriculumId: string,
  rows: CurriculumImportRow[]
): Promise<number> {
  const supabase = createAdminClient();

  const { data: lastItem } = await supabase
    .from("curriculum_items")
    .select("order_number")
    .eq("curriculum_id", curriculumId)
    .order("order_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let startOrder = (lastItem?.order_number || 0) + 1;

  const insertPayloads = rows.map((r, idx) => ({
    curriculum_id: curriculumId,
    order_number: r.orderNumber || startOrder + idx,
    title: r.title.trim(),
    description: r.description?.trim() || null,
    objective: r.objective?.trim() || null,
    practice: r.practice?.trim() || null,
    homework_plan: r.homeworkPlan?.trim() || null,
    duration_minutes: r.durationMinutes || 90,
    category: r.category?.trim() || null,
    planned_date: r.plannedDate || null,
    status: "Rejalashtirilgan" as const,
  }));

  const { data, error } = await supabase
    .from("curriculum_items")
    .insert(insertPayloads)
    .select("id");

  if (error) {
    throw new Error(error.message || "Mavzularni import qilishda xatolik yuz berdi");
  }

  return data?.length || 0;
}

/**
 * Duplicate an entire curriculum (for another group)
 */
export async function duplicateCurriculum(
  curriculumId: string,
  targetGroupId?: string,
  customName?: string
): Promise<string> {
  const supabase = createAdminClient();

  const original = await getCurriculumById(curriculumId);
  if (!original) throw new Error("Ish reja topilmadi");

  const items = await getCurriculumItems(curriculumId);

  const newCurriculumId = await createCurriculum({
    name: customName || `${original.name} (Nusxa)`,
    description: original.description,
    course_name: original.course_name,
    group_id: targetGroupId || null,
    academic_period: original.academic_period,
    status: "Faol",
  });

  if (items.length > 0) {
    const itemPayloads: CurriculumImportRow[] = items.map((it) => ({
      orderNumber: it.order_number,
      title: it.title,
      description: it.description || undefined,
      objective: it.objective || undefined,
      practice: it.practice || undefined,
      homeworkPlan: it.homework_plan || undefined,
      durationMinutes: it.duration_minutes,
      category: it.category || undefined,
    }));

    await bulkImportCurriculumItems(newCurriculumId, itemPayloads);
  }

  return newCurriculumId;
}

/**
 * Reorder items in curriculum safely
 */
export async function reorderCurriculumItems(
  curriculumId: string,
  itemIdsInOrder: string[]
): Promise<void> {
  const supabase = createAdminClient();

  // First shift all order numbers to avoid unique constraint collision
  for (let i = 0; i < itemIdsInOrder.length; i++) {
    await supabase
      .from("curriculum_items")
      .update({ order_number: 10000 + i + 1 })
      .eq("id", itemIdsInOrder[i]);
  }

  // Now assign final sequential numbers 1..N
  for (let i = 0; i < itemIdsInOrder.length; i++) {
    await supabase
      .from("curriculum_items")
      .update({ order_number: i + 1 })
      .eq("id", itemIdsInOrder[i]);
  }
}
