import { createAdminClient } from "@/lib/supabase/admin";
import { CrmAuditIssue } from "@/types/super-ai";

export async function runCrmHealthAudit(): Promise<{
  issues: CrmAuditIssue[];
  stats: {
    totalStudents: number;
    totalGroups: number;
    totalPayments: number;
    healthScore: number;
  };
}> {
  const supabase = createAdminClient();

  const [
    { data: students },
    { data: groups },
    { data: groupStudents },
    { data: payments },
    { data: attendance },
  ] = await Promise.all([
    supabase.from("students").select("*"),
    supabase.from("groups").select("*"),
    supabase.from("group_students").select("*"),
    supabase.from("payments").select("*"),
    supabase.from("attendance").select("*"),
  ]);

  const issues: CrmAuditIssue[] = [];

  const allStudents = students || [];
  const allGroups = groups || [];
  const allGroupStudents = groupStudents || [];
  const allPayments = payments || [];

  // 1. Missing phone numbers
  allStudents.forEach((s) => {
    if (!s.phone || s.phone.trim().length < 7) {
      issues.push({
        id: `issue-phone-${s.id}`,
        type: "missing_phone",
        severity: "medium",
        title: `Telefon raqami kiritilmagan: ${s.first_name} ${s.last_name || ""}`.trim(),
        description: `O'quvchi ma'lumotlarida bog'lanish uchun telefon raqami ko'rsatilmagan.`,
        affectedEntityId: s.id,
        affectedEntityType: "students",
        suggestedFix: "Telefon raqamini kiritish yoki eslatma qoldirish",
        autoFixAvailable: false,
        payload: { studentId: s.id, name: `${s.first_name} ${s.last_name || ""}`.trim() },
      });
    }
  });

  // 2. Duplicate students
  const nameMap = new Map<string, string[]>();
  allStudents.forEach((s) => {
    const fullName = `${s.first_name} ${s.last_name || ""}`.trim().toLowerCase();
    if (fullName) {
      const existing = nameMap.get(fullName) || [];
      existing.push(s.id);
      nameMap.set(fullName, existing);
    }
  });

  nameMap.forEach((ids, name) => {
    if (ids.length > 1) {
      issues.push({
        id: `issue-dup-${ids.join("-")}`,
        type: "duplicate_student",
        severity: "high",
        title: `Takrorlangan o'quvchi yozuvi: "${name}"`,
        description: `Bir xil ismdagi ${ids.length} ta o'quvchi mavjud. Birlashtirish tavsiya etiladi.`,
        affectedEntityId: ids[0],
        affectedEntityType: "students",
        suggestedFix: "O'quvchi yozuvlarini bitta qilib birlashtirish (Merge)",
        autoFixAvailable: true,
        payload: { studentIds: ids, name },
      });
    }
  });

  // 3. Inactive student in active group
  const activeStudentIds = new Set(allStudents.filter((s) => s.status === "Faol").map((s) => s.id));
  const activeGroupIds = new Set(allGroups.filter((g) => g.status === "Faol").map((g) => g.id));

  allGroupStudents.forEach((gs) => {
    if (activeGroupIds.has(gs.group_id) && !activeStudentIds.has(gs.student_id)) {
      const student = allStudents.find((s) => s.id === gs.student_id);
      const group = allGroups.find((g) => g.id === gs.group_id);
      issues.push({
        id: `issue-inactive-gs-${gs.id}`,
        type: "inactive_in_active_group",
        severity: "high",
        title: `Nofaol o'quvchi faol guruhda: ${student ? `${student.first_name} ${student.last_name || ""}` : gs.student_id}`,
        description: `O'quvchi statusi nofaol yoki arxivlangan, lekin "${group?.name || gs.group_id}" guruhida a'zo bo'lib turibdi.`,
        affectedEntityId: gs.id,
        affectedEntityType: "group_students",
        suggestedFix: "O'quvchini guruh a'zoligidan chiqarish yoki statusini Faol qilish",
        autoFixAvailable: true,
        payload: { groupStudentId: gs.id, studentId: gs.student_id, groupId: gs.group_id },
      });
    }
  });

  // 4. Orphan payments
  const studentIds = new Set(allStudents.map((s) => s.id));
  allPayments.forEach((p) => {
    if (!studentIds.has(p.student_id)) {
      issues.push({
        id: `issue-orphan-pay-${p.id}`,
        type: "orphan_record",
        severity: "critical",
        title: `Egasiz to'lov yozuvi (ID: ${p.id.substr(0, 8)})`,
        description: `To'lov summasi: ${p.amount.toLocaleString()} so'm. Bazada tegishli o'quvchi topilmadi.`,
        affectedEntityId: p.id,
        affectedEntityType: "payments",
        suggestedFix: "Egasiz to'lovni o'quvchiga biriktirish yoki arxivlash",
        autoFixAvailable: false,
        payload: { paymentId: p.id, amount: p.amount },
      });
    }
  });

  // Calculate Health Score (100 - penalty per severity)
  let penalty = 0;
  issues.forEach((i) => {
    if (i.severity === "critical") penalty += 15;
    else if (i.severity === "high") penalty += 8;
    else if (i.severity === "medium") penalty += 4;
    else penalty += 1;
  });

  const healthScore = Math.max(0, Math.min(100, 100 - penalty));

  return {
    issues,
    stats: {
      totalStudents: allStudents.length,
      totalGroups: allGroups.length,
      totalPayments: allPayments.length,
      healthScore,
    },
  };
}
