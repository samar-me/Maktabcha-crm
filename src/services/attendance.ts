import { createClient } from "@/lib/supabase/client";
import { Attendance, AttendanceInsert, AttendanceUpdate } from "@/types/database";
import { OfflineDB } from "@/lib/offline/db";
import { OfflineSyncManager } from "@/lib/offline/sync-manager";

export async function getAttendance(params?: {
  lessonId?: string;
  groupId?: string;
  studentId?: string;
  date?: string;
}): Promise<Attendance[]> {
  // If offline, read from IndexedDB
  if (typeof window !== "undefined" && !navigator.onLine) {
    try {
      const cached = await OfflineDB.getAllItems<Attendance>("attendance");
      return cached.filter((item) => {
        if (params?.lessonId && item.lesson_id !== params.lessonId) return false;
        if (params?.groupId && item.group_id !== params.groupId) return false;
        if (params?.studentId && item.student_id !== params.studentId) return false;
        if (params?.date && item.date !== params.date) return false;
        return true;
      });
    } catch {
      return [];
    }
  }

  try {
    const supabase = createClient();
    let query = supabase.from("attendance").select("*").order("date", { ascending: false });

    if (params?.lessonId) query = query.eq("lesson_id", params.lessonId);
    if (params?.groupId) query = query.eq("group_id", params.groupId);
    if (params?.studentId) query = query.eq("student_id", params.studentId);
    if (params?.date) query = query.eq("date", params.date);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const items = (data || []) as Attendance[];
    if (typeof window !== "undefined") {
      OfflineDB.putItems("attendance", items).catch(() => {});
    }

    return items;
  } catch (err) {
    if (typeof window !== "undefined") {
      const cached = await OfflineDB.getAllItems<Attendance>("attendance");
      return cached;
    }
    throw err;
  }
}

export async function saveBatchAttendance(
  records: Array<AttendanceInsert>
): Promise<Attendance[]> {
  // If offline, save to sync queue and return optimistic records
  if (typeof window !== "undefined" && !navigator.onLine) {
    await OfflineDB.enqueueSyncAction("save_attendance", records);
    const optimistic: Attendance[] = records.map((r) => ({
      id: `offline-${Date.now()}-${Math.random()}`,
      lesson_id: r.lesson_id,
      student_id: r.student_id,
      group_id: r.group_id,
      date: r.date,
      status: r.status,
      note: r.note || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    await OfflineDB.putItems("attendance", optimistic);
    OfflineSyncManager.notify();
    return optimistic;
  }

  try {
    const supabase = createClient();
    const { data, error } = await (supabase.from("attendance") as any)
      .upsert(records, {
        onConflict: "lesson_id,student_id",
      })
      .select();

    if (error) {
      throw error;
    }

    const result = (data || []) as Attendance[];
    if (typeof window !== "undefined") {
      OfflineDB.putItems("attendance", result).catch(() => {});
    }

    return result;
  } catch (err: any) {
    // Network fallback: save to queue
    if (typeof window !== "undefined") {
      await OfflineDB.enqueueSyncAction("save_attendance", records);
      OfflineSyncManager.notify();
      return records as any;
    }
    throw err;
  }
}

export async function updateAttendance(
  id: string,
  updates: AttendanceUpdate
): Promise<Attendance> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("attendance") as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating attendance:", error);
    throw new Error(error.message);
  }

  return data as Attendance;
}
