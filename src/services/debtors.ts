import { createClient } from "@/lib/supabase/client";
import { Student, Group, GroupStudent, Payment } from "@/types/database";

export interface DebtorInfo {
  student: Student;
  group: Group;
  monthlyFee: number;
  paidAmount: number;
  debtAmount: number;
  month: number;
  year: number;
  status: "Qarzdor" | "To‘langan" | "Qisman";
}

export async function getDebtors(targetMonth?: number, targetYear?: number): Promise<DebtorInfo[]> {
  const supabase = createClient();
  const now = new Date();
  const currentMonth = targetMonth || now.getMonth() + 1; // 1-12
  const currentYear = targetYear || now.getFullYear();

  // 1. Fetch active students
  const { data: studentsData, error: stErr } = await supabase
    .from("students")
    .select("*")
    .eq("status", "Faol");
  if (stErr) throw new Error(stErr.message);
  const students = (studentsData || []) as Student[];
  const studentMap = new Map(students.map((s) => [s.id, s]));

  // 2. Fetch active groups
  const { data: groupsData, error: grErr } = await supabase
    .from("groups")
    .select("*")
    .eq("status", "Faol");
  if (grErr) throw new Error(grErr.message);
  const groups = (groupsData || []) as Group[];
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  // 3. Fetch active enrollments
  const { data: gsData, error: gsErr } = await supabase
    .from("group_students")
    .select("*")
    .eq("status", "Faol");
  if (gsErr) throw new Error(gsErr.message);
  const enrollments = (gsData || []) as GroupStudent[];

  // 4. Fetch payments for the given month & year
  const { data: paymentsData, error: pErr } = await supabase
    .from("payments")
    .select("*")
    .eq("month", currentMonth)
    .eq("year", currentYear);
  if (pErr) throw new Error(pErr.message);
  const payments = (paymentsData || []) as Payment[];

  // Group payments by `${student_id}_${group_id}`
  const paidMap = new Map<string, number>();
  for (const p of payments) {
    const key = `${p.student_id}_${p.group_id}`;
    paidMap.set(key, (paidMap.get(key) || 0) + Number(p.amount));
  }

  const debtorsList: DebtorInfo[] = [];

  for (const enr of enrollments) {
    const student = studentMap.get(enr.student_id);
    const group = groupMap.get(enr.group_id);
    if (!student || !group) continue;

    const monthlyFee = Number(group.monthly_fee || 0);
    const key = `${enr.student_id}_${enr.group_id}`;
    const paidAmount = paidMap.get(key) || 0;
    const debtAmount = Math.max(0, monthlyFee - paidAmount);

    let status: "Qarzdor" | "To‘langan" | "Qisman" = "To‘langan";
    if (paidAmount === 0) {
      status = "Qarzdor";
    } else if (paidAmount < monthlyFee) {
      status = "Qisman";
    }

    if (debtAmount > 0) {
      debtorsList.push({
        student,
        group,
        monthlyFee,
        paidAmount,
        debtAmount,
        month: currentMonth,
        year: currentYear,
        status,
      });
    }
  }

  return debtorsList.sort((a, b) => b.debtAmount - a.debtAmount);
}
