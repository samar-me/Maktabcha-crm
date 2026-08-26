import { createClient } from "@/lib/supabase/client";
import { Lesson, LessonInsert, LessonUpdate } from "@/types/database";

export async function getLessons(groupId?: string): Promise<Lesson[]> {
  const supabase = createClient();
  let query = supabase.from("lessons").select("*").order("date", { ascending: false });

  if (groupId) {
    query = query.eq("group_id", groupId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching lessons:", error);
    throw new Error(error.message);
  }

  return (data || []) as Lesson[];
}

export async function getLessonById(id: string): Promise<Lesson | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching lesson by id:", error);
    throw new Error(error.message);
  }

  return data as Lesson | null;
}

export async function createLesson(lesson: LessonInsert): Promise<Lesson> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("lessons") as any)
    .insert([lesson])
    .select()
    .single();

  if (error) {
    console.error("Error creating lesson:", error);
    throw new Error(error.message);
  }

  return data as Lesson;
}

export async function updateLesson(id: string, updates: LessonUpdate): Promise<Lesson> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("lessons") as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating lesson:", error);
    throw new Error(error.message);
  }

  return data as Lesson;
}

export async function deleteLesson(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting lesson:", error);
    throw new Error(error.message);
  }

  return true;
}
