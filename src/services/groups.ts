import { createClient } from "@/lib/supabase/client";
import { Group, GroupInsert, GroupUpdate, GroupStudent, Student } from "@/types/database";

export async function getGroups(): Promise<Group[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching groups:", error);
    throw new Error(error.message);
  }

  return (data || []) as Group[];
}

export async function getGroupById(id: string): Promise<Group | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching group by id:", error);
    throw new Error(error.message);
  }

  return data as Group | null;
}

export async function createGroup(group: GroupInsert): Promise<Group> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("groups") as any)
    .insert([
      {
        ...group,
        schedule: group.schedule || [],
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating group:", error);
    throw new Error(error.message);
  }

  return data as Group;
}

export async function updateGroup(id: string, updates: GroupUpdate): Promise<Group> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("groups") as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating group:", error);
    throw new Error(error.message);
  }

  return data as Group;
}

export async function deleteGroup(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting group:", error);
    throw new Error(error.message);
  }

  return true;
}

// Enrollments & Student relationships
export async function getGroupStudents(groupId?: string): Promise<GroupStudent[]> {
  const supabase = createClient();
  let query = supabase.from("group_students").select("*");

  if (groupId) {
    query = query.eq("group_id", groupId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching group students:", error);
    throw new Error(error.message);
  }

  return (data || []) as GroupStudent[];
}

export async function getStudentsByGroupId(groupId: string): Promise<Student[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("group_students")
    .select("student_id, student:students(*)")
    .eq("group_id", groupId)
    .eq("status", "Faol");

  if (error) {
    console.error("Error fetching students by group:", error);
    throw new Error(error.message);
  }

  return (data || []).map((item: any) => item.student).filter(Boolean) as Student[];
}

export async function getGroupsByStudentId(studentId: string): Promise<Group[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("group_students")
    .select("group_id, group:groups(*)")
    .eq("student_id", studentId)
    .eq("status", "Faol");

  if (error) {
    console.error("Error fetching groups by student:", error);
    throw new Error(error.message);
  }

  return (data || []).map((item: any) => item.group).filter(Boolean) as Group[];
}

export async function addStudentToGroup(groupId: string, studentId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await (supabase.from("group_students") as any)
    .upsert(
      {
        group_id: groupId,
        student_id: studentId,
        joined_at: new Date().toISOString().split("T")[0],
        status: "Faol",
      },
      { onConflict: "group_id,student_id" }
    );

  if (error) {
    console.error("Error adding student to group:", error);
    throw new Error(error.message);
  }

  return true;
}

export async function removeStudentFromGroup(groupId: string, studentId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("group_students")
    .delete()
    .eq("group_id", groupId)
    .eq("student_id", studentId);

  if (error) {
    console.error("Error removing student from group:", error);
    throw new Error(error.message);
  }

  return true;
}
