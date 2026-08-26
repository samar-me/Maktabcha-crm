import { createClient } from "@/lib/supabase/client";
import { Attendance, AttendanceInsert, AttendanceUpdate } from "@/types/database";

export async function getAttendance(params?: {
  lessonId?: string;
  groupId?: string;
  studentId?: string;
  date?: string;
}): Promise<Attendance[]> {
  const supabase = createClient();
  let query = supabase.from("attendance").select("*").order("date", { ascending: false });

  if (params?.lessonId) {
    query = query.eq("lesson_id", params.lessonId);
  }
  if (params?.groupId) {
    query = query.eq("group_id", params.groupId);
  }
  if (params?.studentId) {
    query = query.eq("student_id", params.studentId);
  }
  if (params?.date) {
    query = query.eq("date", params.date);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching attendance:", error);
    throw new Error(error.message);
  }

  return (data || []) as Attendance[];
}

export async function saveBatchAttendance(
  records: Array<AttendanceInsert>
): Promise<Attendance[]> {
  const supabase = createClient();

  const { data, error } = await (supabase.from("attendance") as any)
    .upsert(records, {
      onConflict: "lesson_id,student_id",
    })
    .select();

  if (error) {
    console.error("Error saving batch attendance:", error);
    throw new Error(error.message);
  }

  return (data || []) as Attendance[];
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
