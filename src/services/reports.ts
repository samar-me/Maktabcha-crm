import { createClient } from "@/lib/supabase/client";
import { getDebtors } from "@/services/debtors";

export interface MonthlyFinancialSummary {
  totalExpected: number;
  totalCollected: number;
  totalDebt: number;
  collectionRate: number;
  debtorsCount: number;
  totalDiscount: number;
}

export async function getMonthlyFinancialSummary(
  targetMonth?: number,
  targetYear?: number
): Promise<MonthlyFinancialSummary> {
  const supabase = createClient();
  const now = new Date();
  const currentMonth = targetMonth || now.getMonth() + 1;
  const currentYear = targetYear || now.getFullYear();

  // 1. Fetch active groups
  const { data: groupsData, error: grErr } = await supabase
    .from("groups")
    .select("id, monthly_fee")
    .eq("status", "Faol");
  if (grErr) throw new Error(grErr.message);

  const groupFeeMap = new Map<string, number>();
  (groupsData || []).forEach((g: any) => groupFeeMap.set(g.id, Number(g.monthly_fee || 0)));

  // 2. Fetch active enrollments
  const { data: gsData, error: gsErr } = await supabase
    .from("group_students")
    .select("group_id")
    .eq("status", "Faol");
  if (gsErr) throw new Error(gsErr.message);

  let totalExpected = 0;
  (gsData || []).forEach((gs: any) => {
    totalExpected += groupFeeMap.get(gs.group_id) || 0;
  });

  // 3. Fetch payments for this month & year
  const { data: paymentsData, error: pErr } = await supabase
    .from("payments")
    .select("amount, final_amount, discount_amount, payment_status, cancelled_at")
    .eq("month", currentMonth)
    .eq("year", currentYear);
  if (pErr) throw new Error(pErr.message);

  const validPayments = (paymentsData || []).filter((p: any) => (p.payment_status || "paid") === "paid" && !p.cancelled_at);
  const totalCollected = validPayments.reduce((acc: number, p: any) => acc + Number(p.final_amount ?? p.amount ?? 0), 0);
  const totalDiscount = validPayments.reduce((acc: number, p: any) => acc + Number(p.discount_amount || 0), 0);

  const debtors = await getDebtors(currentMonth, currentYear);
  const totalDebt = debtors.reduce((sum, row) => sum + row.debtAmount, 0);
  const covered = totalCollected + totalDiscount;
  const collectionRate = totalExpected > 0 ? Math.min(100, Math.round((covered / totalExpected) * 100)) : 0;

  return {
    totalExpected,
    totalCollected,
    totalDebt,
    collectionRate,
    debtorsCount: debtors.length,
    totalDiscount,
  };
}
