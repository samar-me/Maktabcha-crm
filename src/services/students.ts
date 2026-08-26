import { createClient } from "@/lib/supabase/client";
import { Student, StudentInsert, StudentUpdate } from "@/types/database";

export async function getStudents(): Promise<Student[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching students:", error);
    throw new Error(error.message);
  }

  return (data || []) as Student[];
}

export async function getStudentById(id: string): Promise<Student | null> {
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

  return data as Student | null;
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

  return data as Student;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting student:", error);
    throw new Error(error.message);
  }

  return true;
}
