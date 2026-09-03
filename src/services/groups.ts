import { createClient } from "@/lib/supabase/client";
import { Group, GroupInsert, GroupUpdate, GroupStudent, Student } from "@/types/database";
import { OfflineDB } from "@/lib/offline/db";
import { deleteGroupAction } from "@/actions/groups";
import { memoryCache } from "@/lib/cache/memory-cache";

const GROUPS_CACHE_KEY = "cache_groups_all";

export async function getGroups(): Promise<Group[]> {
  // 1. Instant Memory Cache (0ms)
  if (typeof window !== "undefined") {
    const memCached = memoryCache.get<Group[]>(GROUPS_CACHE_KEY);
    if (memCached) return memCached;
  }

  // 2. Offline fallback (IndexedDB)
  if (typeof window !== "undefined" && !navigator.onLine) {
    try {
      const dbCached = await OfflineDB.getAllItems<Group>("groups");
      memoryCache.set(GROUPS_CACHE_KEY, dbCached, 30);
      return dbCached;
    } catch {
      return [];
    }
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const items = (data || []) as Group[];
    if (typeof window !== "undefined") {
      memoryCache.set(GROUPS_CACHE_KEY, items, 60);
      OfflineDB.putItems("groups", items).catch(() => {});
    }

    return items;
  } catch (err) {
    if (typeof window !== "undefined") {
      return await OfflineDB.getAllItems<Group>("groups");
    }
    throw err;
  }
}

export async function getGroupById(id: string): Promise<Group | null> {
  const cacheKey = `cache_group_${id}`;
  if (typeof window !== "undefined") {
    const memCached = memoryCache.get<Group>(cacheKey);
    if (memCached) return memCached;
  }

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

  const group = data as Group | null;
  if (group && typeof window !== "undefined") {
    memoryCache.set(cacheKey, group, 60);
  }

  return group;
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

  if (typeof window !== "undefined") {
    memoryCache.invalidate("cache_group");
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

  if (typeof window !== "undefined") {
    memoryCache.invalidate("cache_group");
  }

  return data as Group;
}

export async function deleteGroup(id: string): Promise<boolean> {
  const res = await deleteGroupAction(id);
  if (!res.success) {
    console.error("Error deleting group:", res.error);
    throw new Error(res.error || "Guruhni o‘chirishda xatolik");
  }

  if (typeof window !== "undefined") {
    memoryCache.invalidate("cache_group");
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
  const cacheKey = `cache_group_students_${groupId}`;
  if (typeof window !== "undefined") {
    const memCached = memoryCache.get<Student[]>(cacheKey);
    if (memCached) return memCached;
  }

  if (typeof window !== "undefined" && !navigator.onLine) {
    try {
      const allStudents = await OfflineDB.getAllItems<Student>("students");
      return allStudents;
    } catch {
      return [];
    }
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("group_students")
      .select("student_id, student:students(*)")
      .eq("group_id", groupId)
      .eq("status", "Faol");

    if (error) {
      throw error;
    }

    const students = (data || []).map((item: any) => item.student).filter(Boolean) as Student[];
    if (typeof window !== "undefined") {
      memoryCache.set(cacheKey, students, 60);
      OfflineDB.putItems("students", students).catch(() => {});
    }

    return students;
  } catch (err) {
    if (typeof window !== "undefined") {
      return await OfflineDB.getAllItems<Student>("students");
    }
    throw err;
  }
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

  if (typeof window !== "undefined") {
    memoryCache.invalidate(`cache_group_students_${groupId}`);
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

  if (typeof window !== "undefined") {
    memoryCache.invalidate(`cache_group_students_${groupId}`);
  }

  return true;
}
