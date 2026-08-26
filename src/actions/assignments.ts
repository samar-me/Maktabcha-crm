"use server";

import {
  getAssignments,
  getAssignmentById,
  getAssignmentProgress,
  createAssignment,
  updateAssignment,
  publishAssignment,
  finalizeAssignment,
  resetStudentAttempt,
  duplicateAssignment,
} from "@/services/assignments";
import { getStudentsByGroupId } from "@/services/groups";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuestionDraft } from "@/types/assignment";
import { revalidatePath } from "next/cache";

export async function getAssignmentsAction(filters?: { groupId?: string; status?: string }) {
  try {
    const data = await getAssignments(filters);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function getAssignmentByIdAction(id: string) {
  try {
    const data = await getAssignmentById(id);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: null, error: err.message };
  }
}

export async function getAssignmentProgressAction(id: string) {
  try {
    const data = await getAssignmentProgress(id);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function getGroupStudentsAction(groupId: string) {
  try {
    const data = await getStudentsByGroupId(groupId);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function createAssignmentAction(data: {
  groupId: string;
  title: string;
  description?: string;
  scoringBasePoints?: number;
  scoringRankStep?: number;
  scoringMinPoints?: number;
  antiCheatMode?: boolean;
  questions: QuestionDraft[];
}) {
  try {
    const id = await createAssignment(data);
    revalidatePath("/assignments");
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: err.message || "Topshiriq yaratishda xatolik" };
  }
}

export async function updateAssignmentAction(
  id: string,
  data: {
    groupId?: string;
    title: string;
    description?: string;
    scoringBasePoints?: number;
    scoringRankStep?: number;
    questions?: QuestionDraft[];
  }
) {
  try {
    await updateAssignment(id, data);
    revalidatePath(`/assignments/${id}`);
    revalidatePath("/assignments");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Topshiriqni yangilashda xatolik" };
  }
}

export async function deleteAssignmentAction(id: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/assignments");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Topshiriqni o‘chirishda xatolik" };
  }
}

export async function publishAssignmentAction(id: string, sendToTelegram = true) {
  try {
    await publishAssignment(id, sendToTelegram);
    revalidatePath(`/assignments/${id}`);
    revalidatePath("/assignments");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "E'lon qilishda xatolik" };
  }
}

export async function finalizeAssignmentAction(id: string) {
  try {
    const res = await finalizeAssignment(id);
    revalidatePath(`/assignments/${id}`);
    revalidatePath("/assignments");
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err.message || "Yakunlashda xatolik" };
  }
}

export async function resetStudentAttemptAction(assignmentId: string, studentId: string) {
  try {
    await resetStudentAttempt(assignmentId, studentId);
    revalidatePath(`/assignments/${assignmentId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Attemptni tiklashda xatolik" };
  }
}

export async function duplicateAssignmentAction(id: string) {
  try {
    const newId = await duplicateAssignment(id);
    revalidatePath("/assignments");
    return { success: true, newId };
  } catch (err: any) {
    return { success: false, error: err.message || "Nusxa olishda xatolik" };
  }
}
