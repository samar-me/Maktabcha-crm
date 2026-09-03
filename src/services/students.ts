import { createClient } from "@/lib/supabase/client";
import { Student, StudentInsert, StudentUpdate } from "@/types/database";
import { OfflineDB } from "@/lib/offline/db";
import { deleteStudentAction } from "@/actions/students";
import { memoryCache } from "@/lib/cache/memory-cache";

const STUDENTS_CACHE_KEY = "cache_students_all";

export async function getStudents(): Promise<Student[]> {
  // 1. Instant Memory Cache (0ms)
  if (typeof window !== "undefined") {
    const memCached = memoryCache.get<Student[]>(STUDENTS_CACHE_KEY);
    if (memCached) return memCached;
  }

  // 2. Offline fallback (IndexedDB)
  if (typeof window !== "undefined" && !navigator.onLine) {
    try {
      const dbCached = await OfflineDB.getAllItems<Student>("students");
      memoryCache.set(STUDENTS_CACHE_KEY, dbCached, 30);
      return dbCached;
    } catch {
      return [];
    }
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const items = (data || []) as Student[];
    if (typeof window !== "undefined") {
      memoryCache.set(STUDENTS_CACHE_KEY, items, 60);
      OfflineDB.putItems("students", items).catch(() => {});
    }

    return items;
  } catch (err) {
    if (typeof window !== "undefined") {
      return await OfflineDB.getAllItems<Student>("students");
    }
    throw err;
  }
}

export async function getStudentById(id: string): Promise<Student | null> {
  const cacheKey = `cache_student_${id}`;
  if (typeof window !== "undefined") {
    const memCached = memoryCache.get<Student>(cacheKey);
    if (memCached) return memCached;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching student by id:", error);
    throw new Error(error.message);
  }

  const student = data as Student | null;
  if (student && typeof window !== "undefined") {
    memoryCache.set(cacheKey, student, 60);
  }

  return student;
}

export async function createStudent(student: StudentInsert): Promise<Student> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("students") as any)
    .insert([student])
    .select()
    .single();

  if (error) {
    console.error("Error creating student:", error);
    throw new Error(error.message);
  }

  if (typeof window !== "undefined") {
    memoryCache.invalidate("cache_students");
  }

  return data as Student;
}

export async function updateStudent(id: string, updates: StudentUpdate): Promise<Student> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("students") as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating student:", error);
    throw new Error(error.message);
  }

  if (typeof window !== "undefined") {
    memoryCache.invalidate("cache_students");
  }

  return data as Student;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const res = await deleteStudentAction(id);
  if (!res.success) {
    console.error("Error deleting student:", res.error);
    throw new Error(res.error || "O‘quvchini o‘chirishda xatolik");
  }

  if (typeof window !== "undefined") {
    memoryCache.invalidate("cache_students");
  }

  return true;
}
