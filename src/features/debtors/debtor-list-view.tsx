"use client";

import * as React from "react";
import Link from "next/link";
import { Student, Group, Payment } from "@/types/database";
import { crmStore, DebtorInfo } from "@/services/crm-store";
import { PaymentFormDialog } from "@/features/payments/payment-form-dialog";
import { PaymentFormValues } from "@/features/payments/payment-schema";
import { StatCard } from "@/components/shared/stat-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { EmptyState } from "@/components/shared/empty-state";
import { excelExport } from "@/lib/excel-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Search,
  Phone,
  PhoneCall,
  CreditCard,
  CheckCircle2,
  Calendar,
  UsersRound,
  ShieldAlert,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

export function DebtorListView() {
  const [debtors, setDebtors] = React.useState<DebtorInfo[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");

  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = React.useState<Student | null>(null);

  const loadData = React.useCallback(() => {
    setDebtors(crmStore.getDebtors());
    setGroups(crmStore.getGroups());
    setStudents(crmStore.getStudents());
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

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

      const matchesGroup =
        groupFilter === "all" || d.groups.some((g) => g.id === groupFilter);

      return matchesSearch && matchesGroup;
    });
  }, [debtors, searchQuery, groupFilter]);

  const handleOpenPayment = (student: Student) => {
    setSelectedStudentForPayment(student);
    setPaymentDialogOpen(true);
  };

  const handleSavePayment = async (values: PaymentFormValues) => {
    try {
      crmStore.savePayment({
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
      loadData();
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
  const summary = crmStore.getMonthlyFinancialSummary();

  return (
    <div className="space-y-6">
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Umumiy qarzdorlik"
          value={<MoneyDisplay amount={totalDebtAmount} size="lg" variant="negative" />}
          icon={ShieldAlert}
          subtitle={`${totalDebtorsCount} nafar qarzdor bo‘yicha jami`}
          iconColorClass="text-rose-600 dark:text-rose-400"
          iconBgClass="bg-rose-50 dark:bg-rose-950/50"
        />
        <StatCard
          title="Qarzdor o‘quvchilar"
          value={`${totalDebtorsCount} nafar`}
          icon={UsersRound}
          subtitle="To‘lovi kechikkan o‘quvchilar"
          iconColorClass="text-amber-600 dark:text-amber-400"
          iconBgClass="bg-amber-50 dark:bg-amber-950/50"
        />
        <StatCard
          title="O‘rtacha qarz miqdori"
          value={<MoneyDisplay amount={averageDebt} size="lg" />}
          icon={CreditCard}
          subtitle="Bir qarzdorga to‘g‘ri keladigan summa"
          iconColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="To‘lov intizomi"
          value={`${summary.collectionRate}%`}
          icon={CheckCircle2}
          subtitle={`Rejadagi ${formatCurrency(summary.totalExpected)} dan`}
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="O‘quvchi ismi, o‘zining yoki ota-onasining telefoni bo‘yicha qidirish..."
              className="pl-9 text-sm"
            />
          </div>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            aria-label="Guruh bo‘yicha filtrlash"
            className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Barcha guruhlar</option>
            {groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          onClick={handleExportExcel}
          className="gap-2 shrink-0 text-xs h-9"
          size="sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Qarzdorlarni Excelga yuklash</span>
        </Button>
      </div>

      {/* Debtors List */}
      {filteredDebtors.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Qarzdorlar mavjud emas!"
          description="Ajoyib natija! Barcha o‘quvchilar o‘z vaqtida to‘lovlarni amalga oshirgan yoki qidiruv bo‘yicha qarzdor topilmadi."
        />
      ) : (
        <Card className="shadow-sm overflow-hidden border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">O‘quvchi</th>
                  <th className="px-4 py-3.5 font-semibold">Aloqa (Telefonlar)</th>
                  <th className="px-4 py-3.5 font-semibold">Guruhlari</th>
                  <th className="px-4 py-3.5 font-semibold">To‘lanmagan davr</th>
                  <th className="px-4 py-3.5 font-semibold">Oxirgi to‘lov</th>
                  <th className="px-4 py-3.5 font-semibold">Qarz summasi</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDebtors.map((d) => {
                  return (
                    <tr key={d.student.id} className="hover:bg-muted/20 transition-colors">
                      {/* Student info */}
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

                      {/* Phone contacts */}
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

                      {/* Groups */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {d.groups.map((g) => (
                            <span
                              key={g.id}
                              className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                            >
                              {g.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Unpaid Months */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          {d.unpaidMonths.join(", ") || "Joriy oy"}
                        </span>
                      </td>

                      {/* Last payment date */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                        {d.lastPaymentDate ? formatDate(d.lastPaymentDate) : "To‘lov bo‘lmagan"}
                      </td>

                      {/* Debt Amount */}
                      <td className="px-4 py-3.5">
                        <MoneyDisplay amount={d.debtAmount} size="sm" variant="negative" />
                      </td>

                      {/* Quick Action */}
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
