"use client";

import * as React from "react";
import Link from "next/link";
import { Student, Group } from "@/types/database";
import { getDebtors, DebtorInfo } from "@/services/debtors";
import { getMonthlyFinancialSummary, MonthlyFinancialSummary } from "@/services/reports";
import { getGroups } from "@/services/groups";
import { getStudents } from "@/services/students";
import { createPayment } from "@/services/payments";
import { PaymentFormDialog } from "@/features/payments/payment-form-dialog";
import { PaymentFormValues } from "@/features/payments/payment-schema";
import { StatCard } from "@/components/shared/stat-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { EmptyState } from "@/components/shared/empty-state";
import { excelExport } from "@/lib/excel-export";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Search,
  Phone,
  PhoneCall,
  CreditCard,
  CheckCircle2,
  UsersRound,
  ShieldAlert,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

export function DebtorListView() {
  const [debtors, setDebtors] = React.useState<DebtorInfo[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [summary, setSummary] = React.useState<MonthlyFinancialSummary>({
    totalExpected: 0,
    totalDiscount: 0,
    totalCollected: 0,
    totalDebt: 0,
    collectionRate: 0,
    debtorsCount: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");

  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = React.useState<Student | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dList, grList, stList, summ] = await Promise.all([
        getDebtors(),
        getGroups(),
        getStudents(),
        getMonthlyFinancialSummary(),
      ]);
      setDebtors(dList);
      setGroups(grList);
      setStudents(stList);
      setSummary(summ);
    } catch {
      setError("Qarzdorlar ro‘yxatini yuklashda xatolik yuz berdi");
      toast.error("Qarzdorlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(loadData);

  const filteredDebtors = React.useMemo(() => {
    return debtors.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const studentName = `${d.student.first_name} ${d.student.last_name || ""}`.toLowerCase();
      const studentPhone = d.student.phone?.toLowerCase() || "";
      const parentPhone = d.student.parent_phone?.toLowerCase() || "";

      const matchesSearch =
        !q ||
        studentName.includes(q) ||
        studentPhone.includes(q) ||
        parentPhone.includes(q);

      const matchesGroup = groupFilter === "all" || d.group.id === groupFilter;

      return matchesSearch && matchesGroup;
    });
  }, [debtors, searchQuery, groupFilter]);

  const handleOpenPayment = (student: Student) => {
    setSelectedStudentForPayment(student);
    setPaymentDialogOpen(true);
  };

  const handleSavePayment = async (values: PaymentFormValues) => {
    try {
      await createPayment({
        student_id: values.student_id,
        group_id: values.group_id,
        amount: values.amount,
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        month: values.month,
        year: values.year,
        note: values.note || null,
      });

      toast.success("To‘lov qabul qilindi va qarzdorlik balansi yangilandi!");
      await loadData();
    } catch {
      toast.error("To‘lovni qabul qilishda xatolik");
    }
  };

  const handleExportExcel = () => {
    if (filteredDebtors.length === 0) {
      toast.error("Eksport qilish uchun qarzdorlar mavjud emas");
      return;
    }
    excelExport.exportDebtors(filteredDebtors);
    toast.success("Qarzdorlar ro‘yxati Excel (.xlsx) fayliga yuklandi!");
  };

  // Metrics
  const totalDebtAmount = filteredDebtors.reduce((acc, d) => acc + d.debtAmount, 0);
  const totalDebtorsCount = filteredDebtors.length;
  const averageDebt = totalDebtorsCount > 0 ? Math.round(totalDebtAmount / totalDebtorsCount) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Qarzdorlik"
          value={<MoneyDisplay amount={totalDebtAmount} size="md" variant="negative" />}
          icon={ShieldAlert}
          subtitle={`${totalDebtorsCount} nafar qarzdor`}
          iconColorClass="text-rose-600 dark:text-rose-400"
          iconBgClass="bg-rose-50 dark:bg-rose-950/50"
        />
        <StatCard
          title="Qarzdorlar"
          value={`${totalDebtorsCount} nafar`}
          icon={UsersRound}
          subtitle="To‘lovi kutilayotganlar"
          iconColorClass="text-amber-600 dark:text-amber-400"
          iconBgClass="bg-amber-50 dark:bg-amber-950/50"
        />
        <StatCard
          title="O‘rtacha qarz"
          value={<MoneyDisplay amount={averageDebt} size="md" />}
          icon={CreditCard}
          subtitle="Bir o‘quvchiga to‘g‘ri keladigan"
          iconColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="Intizom"
          value={`${summary.collectionRate}%`}
          icon={CheckCircle2}
          subtitle={`Rejadagi ${formatCurrency(summary.totalExpected)} dan`}
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="O‘quvchi ismi yoki telefoni bo‘yicha qidirish..."
              className="pl-9 text-base sm:text-sm h-11 sm:h-9"
            />
          </div>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            aria-label="Guruh bo‘yicha filtrlash"
            className="h-10 sm:h-9 px-3 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
          >
            <option value="all">Barcha guruhlar</option>
            {groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Jami: <strong className="text-foreground font-bold">{filteredDebtors.length}</strong> nafar qarzdor
          </span>

          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="gap-1.5 shrink-0 text-xs h-9"
            size="sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Qarzdorlarni Excelga yuklash</span>
            <span className="sm:hidden">Excel</span>
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <span className="text-xs font-medium">{error}</span>
          <Button variant="outline" size="sm" onClick={loadData} className="text-xs h-8 gap-1">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Qayta urinish</span>
          </Button>
        </div>
      )}

      {/* Debtors List / Table */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Qarzdorlar ro‘yxati yuklanmoqda...</p>
        </div>
      ) : filteredDebtors.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Qarzdorlar mavjud emas!"
          description="Ajoyib natija! Barcha o‘quvchilar o‘z vaqtida to‘lovlarni amalga oshirgan yoki qidiruv bo‘yicha qarzdor topilmadi."
        />
      ) : (
        <>
          {/* Mobile Debtor Cards (md:hidden) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredDebtors.map((d) => (
              <Card key={`${d.student.id}_${d.group.id}`} className="p-4 space-y-3 border-rose-200/80 dark:border-rose-950/80 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {d.student.first_name[0]}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/students/${d.student.id}`}
                        className="font-bold text-foreground hover:text-blue-600 transition-colors text-sm block truncate"
                      >
                        {d.student.first_name} {d.student.last_name || ""}
                      </Link>
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {d.group.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">
                      Qarz
                    </span>
                    <MoneyDisplay amount={d.debtAmount} size="md" variant="negative" />
                  </div>
                </div>

                {/* Amounts Breakdown */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 text-xs border border-border/50">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Oylik tarif:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(d.monthlyFee)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">To‘langan:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(d.paidAmount)}</span>
                  </div>
                </div>

                {/* Contacts */}
                <div className="grid grid-cols-1 gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/60">
                  {d.student.phone && (
                    <a
                      href={`tel:${d.student.phone}`}
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-mono py-1 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{d.student.phone} (o‘quvchi)</span>
                    </a>
                  )}
                  {d.student.parent_phone && (
                    <a
                      href={`tel:${d.student.parent_phone}`}
                      className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono py-1 hover:underline"
                    >
                      <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                      <span>{d.student.parent_phone} ({d.student.parent_name || "ota-onasi"})</span>
                    </a>
                  )}
                </div>

                {/* Action */}
                <div className="pt-2 border-t border-border/60">
                  <Button
                    size="sm"
                    onClick={() => handleOpenPayment(d.student)}
                    className="w-full h-10 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>To‘lov qabul qilish</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <Card className="hidden md:block shadow-sm overflow-hidden border-border/80">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">O‘quvchi</th>
                    <th className="px-4 py-3.5 font-semibold">Aloqa (Telefonlar)</th>
                    <th className="px-4 py-3.5 font-semibold">Guruh</th>
                    <th className="px-4 py-3.5 font-semibold">Oylik to‘lov</th>
                    <th className="px-4 py-3.5 font-semibold">To‘langan</th>
                    <th className="px-4 py-3.5 font-semibold">Qarz summasi</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDebtors.map((d) => {
                    return (
                      <tr key={`${d.student.id}_${d.group.id}`} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center">
                              {d.student.first_name[0]}
                            </div>
                            <div>
                              <Link
                                href={`/students/${d.student.id}`}
                                className="font-bold text-foreground hover:text-blue-600 transition-colors block"
                              >
                                {d.student.first_name} {d.student.last_name || ""}
                              </Link>
                              <span className="text-[11px] text-muted-foreground">
                                {d.student.parent_name ? `Ota-onasi: ${d.student.parent_name}` : "Ota-onasi kiritilmagan"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs space-y-1">
                          {d.student.phone && (
                            <a
                              href={`tel:${d.student.phone}`}
                              className="flex items-center gap-1.5 font-mono text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{d.student.phone}</span>
                            </a>
                          )}
                          {d.student.parent_phone && (
                            <a
                              href={`tel:${d.student.parent_phone}`}
                              className="flex items-center gap-1.5 font-mono text-muted-foreground hover:text-foreground"
                            >
                              <PhoneCall className="w-3 h-3 text-emerald-600" />
                              <span>{d.student.parent_phone} (ota-onasi)</span>
                            </a>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {d.group.name}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-xs font-medium text-foreground">
                          <MoneyDisplay amount={d.monthlyFee} size="sm" />
                        </td>

                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          <MoneyDisplay amount={d.paidAmount} size="sm" variant="positive" />
                        </td>

                        <td className="px-4 py-3.5">
                          <MoneyDisplay amount={d.debtAmount} size="sm" variant="negative" />
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayment(d.student)}
                            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>To‘lov qabul qilish</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Payment Form Dialog pre-filled with selected debtor */}
      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        groups={groups}
        students={students}
        initialStudentId={selectedStudentForPayment?.id}
        onSave={handleSavePayment}
      />
    </div>
  );
}
