"use client";

import * as React from "react";
import { Payment, Group, Student } from "@/types/database";
import { getPayments, createPayment, updatePayment, deletePayment } from "@/services/payments";
import { getGroups } from "@/services/groups";
import { getStudents } from "@/services/students";
import { getMonthlyFinancialSummary, MonthlyFinancialSummary } from "@/services/reports";
import { PaymentFormDialog } from "./payment-form-dialog";
import { PaymentReceiptDialog } from "./payment-receipt-dialog";
import { PaymentFormValues } from "./payment-schema";
import { StatCard } from "@/components/shared/stat-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { excelExport } from "@/lib/excel-export";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  CreditCard,
  Banknote,
  Landmark,
  TrendingUp,
  Receipt,
  MoreVertical,
  Edit,
  Trash2,
  Wallet,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

export function PaymentListView() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [summary, setSummary] = React.useState<MonthlyFinancialSummary>({
    totalExpected: 0,
    totalCollected: 0,
    totalDebt: 0,
    collectionRate: 0,
    debtorsCount: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");
  const [methodFilter, setMethodFilter] = React.useState<string>("all");

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingPayment, setEditingPayment] = React.useState<Payment | null>(null);

  const [receiptDialogOpen, setReceiptDialogOpen] = React.useState(false);
  const [receiptPayment, setReceiptPayment] = React.useState<Payment | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [paymentToDelete, setPaymentToDelete] = React.useState<Payment | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [pmtList, grpList, stList, summ] = await Promise.all([
        getPayments(),
        getGroups(),
        getStudents(),
        getMonthlyFinancialSummary(),
      ]);
      setPayments(pmtList);
      setGroups(grpList);
      setStudents(stList);
      setSummary(summ);
    } catch {
      setError("To‘lovlar ro‘yxatini yuklashda xatolik yuz berdi");
      toast.error("To‘lovlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(loadData);

  const filteredPayments = React.useMemo(() => {
    return payments.filter((pmt) => {
      const student = students.find((s) => s.id === pmt.student_id);
      const studentName = student ? `${student.first_name} ${student.last_name || ""}`.toLowerCase() : "";
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        studentName.includes(q) ||
        (pmt.note && pmt.note.toLowerCase().includes(q));

      const matchesGroup = groupFilter === "all" || pmt.group_id === groupFilter;
      const matchesMethod = methodFilter === "all" || pmt.payment_method === methodFilter;

      return matchesSearch && matchesGroup && matchesMethod;
    });
  }, [payments, students, searchQuery, groupFilter, methodFilter]);

  const handleSavePayment = async (values: PaymentFormValues, id?: string) => {
    try {
      if (id) {
        await updatePayment(id, {
          student_id: values.student_id,
          group_id: values.group_id,
          amount: values.amount,
          payment_date: values.payment_date,
          payment_method: values.payment_method,
          month: values.month,
          year: values.year,
          note: values.note || null,
        });
        toast.success("To‘lov ma'lumotlari yangilandi");
      } else {
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
        toast.success("To‘lov qabul qilindi");
      }

      await loadData();
    } catch {
      toast.error("To‘lovni saqlashda xatolik yuz berdi");
    }
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await deletePayment(paymentToDelete.id);
      toast.success("To‘lov o‘chirildi");
      setDeleteConfirmOpen(false);
      setPaymentToDelete(null);
      await loadData();
    } catch {
      toast.error("O‘chirishda xatolik");
    }
  };

  const handleOpenReceipt = (pmt: Payment) => {
    setReceiptPayment(pmt);
    setReceiptDialogOpen(true);
  };

  const handleExportExcel = () => {
    if (filteredPayments.length === 0) {
      toast.error("Eksport qilish uchun to‘lovlar mavjud emas");
      return;
    }
    excelExport.exportPayments(filteredPayments, students, groups);
    toast.success("To‘lovlar hisoboti Excel (.xlsx) fayliga yuklandi!");
  };

  const totalAmountFiltered = filteredPayments.reduce((acc, p) => acc + Number(p.amount), 0);

  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Jami tushum"
          value={<MoneyDisplay amount={summary.totalCollected} size="md" variant="positive" />}
          icon={Wallet}
          subtitle={`Yig‘ish: ${summary.collectionRate}%`}
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <StatCard
          title="Kutilayotgan"
          value={<MoneyDisplay amount={summary.totalExpected} size="md" />}
          icon={TrendingUp}
          subtitle="Oylik to‘liq reja"
          iconColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="Qarzdorlik"
          value={<MoneyDisplay amount={summary.totalDebt} size="md" variant="negative" />}
          icon={CreditCard}
          subtitle={`${summary.debtorsCount} nafar qarzdor`}
          iconColorClass="text-rose-600 dark:text-rose-400"
          iconBgClass="bg-rose-50 dark:bg-rose-950/50"
        />
        <StatCard
          title="To‘lovlar soni"
          value={`${filteredPayments.length} ta`}
          icon={Receipt}
          subtitle={formatCurrency(totalAmountFiltered)}
          iconColorClass="text-purple-600 dark:text-purple-400"
          iconBgClass="bg-purple-50 dark:bg-purple-950/50"
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
              placeholder="O‘quvchi ismi yoki izoh bo‘yicha qidirish..."
              className="pl-9 text-base sm:text-sm h-11 sm:h-9"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              aria-label="Guruh bo‘yicha filtrlash"
              className="h-10 sm:h-9 px-3 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring flex-1 sm:flex-initial"
            >
              <option value="all">Barcha guruhlar</option>
              {groups.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {grp.name}
                </option>
              ))}
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              aria-label="To‘lov usuli bo‘yicha filtrlash"
              className="h-10 sm:h-9 px-3 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring flex-1 sm:flex-initial"
            >
              <option value="all">Barcha usullar</option>
              <option value="Karta">Karta</option>
              <option value="Naqd">Naqd</option>
              <option value="O‘tkazma">O‘tkazma</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Jami: <strong className="text-foreground font-bold">{filteredPayments.length}</strong> ta to‘lov
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="gap-1.5 shrink-0 text-xs h-9"
              size="sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Excelga yuklash</span>
              <span className="sm:hidden">Excel</span>
            </Button>

            <Button
              onClick={() => {
                setEditingPayment(null);
                setFormDialogOpen(true);
              }}
              className="gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-xs h-9 font-semibold"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span>To‘lov qabul qilish</span>
            </Button>
          </div>
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

      {/* Table / Cards */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs font-medium">To‘lovlar yuklanmoqda...</p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="To‘lovlar topilmadi"
          description={
            searchQuery || groupFilter !== "all" || methodFilter !== "all"
              ? "Qidiruv so‘rovi yoki filtr bo‘yicha to‘lov topilmadi."
              : "Hozircha to‘lovlar jurnali bo‘sh. Birinchi to‘lovni qabul qiling."
          }
          actionLabel={searchQuery ? "Qidiruvni tozalash" : "To‘lov qabul qilish"}
          onAction={() => {
            if (searchQuery || groupFilter !== "all" || methodFilter !== "all") {
              setSearchQuery("");
              setGroupFilter("all");
              setMethodFilter("all");
            } else {
              setEditingPayment(null);
              setFormDialogOpen(true);
            }
          }}
        />
      ) : (
        <>
          {/* Mobile Payment Cards (md:hidden) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredPayments.map((pmt) => {
              const student = students.find((s) => s.id === pmt.student_id);
              const group = groups.find((g) => g.id === pmt.group_id);

              return (
                <Card key={pmt.id} className="p-4 space-y-3 border border-border shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {student?.first_name[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-foreground text-sm block truncate">
                          {student?.first_name} {student?.last_name || ""}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          {group?.name || "Guruh"}
                        </span>
                      </div>
                    </div>
                    <MoneyDisplay amount={pmt.amount} size="md" variant="positive" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">To‘lov davri:</span>
                      <span className="font-medium text-foreground">
                        {monthNames[pmt.month - 1]} {pmt.year}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Sanasi & Usuli:</span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {formatDate(pmt.payment_date)} &bull; {pmt.payment_method}
                      </span>
                    </div>
                  </div>

                  {pmt.note && (
                    <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg italic">
                      {pmt.note}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReceipt(pmt)}
                      className="h-9 text-xs gap-1.5 flex-1"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kvitansiya</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPayment(pmt);
                        setFormDialogOpen(true);
                      }}
                      className="h-9 text-xs gap-1 flex-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Tahrirlash</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setPaymentToDelete(pmt);
                        setDeleteConfirmOpen(true);
                      }}
                      className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <Card className="hidden md:block shadow-sm overflow-hidden border-border/80">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">O‘quvchi</th>
                    <th className="px-4 py-3.5 font-semibold">Guruh</th>
                    <th className="px-4 py-3.5 font-semibold">To‘lov davri</th>
                    <th className="px-4 py-3.5 font-semibold">Usuli</th>
                    <th className="px-4 py-3.5 font-semibold">Sana</th>
                    <th className="px-4 py-3.5 font-semibold">Summa</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.map((pmt) => {
                    const student = students.find((s) => s.id === pmt.student_id);
                    const group = groups.find((g) => g.id === pmt.group_id);

                    return (
                      <tr key={pmt.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                              {student?.first_name[0] || "?"}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground block">
                                {student?.first_name} {student?.last_name || ""}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {student?.phone || ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {group?.name || "Guruh"}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-medium text-foreground">
                          {monthNames[pmt.month - 1]} {pmt.year}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground flex items-center gap-1 w-fit">
                            {pmt.payment_method === "Karta" && <CreditCard className="w-3 h-3 text-blue-600" />}
                            {pmt.payment_method === "Naqd" && <Banknote className="w-3 h-3 text-emerald-600" />}
                            {pmt.payment_method === "O‘tkazma" && <Landmark className="w-3 h-3 text-purple-600" />}
                            <span>{pmt.payment_method}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                          {formatDate(pmt.payment_date)}
                        </td>

                        <td className="px-4 py-3.5">
                          <MoneyDisplay amount={pmt.amount} size="sm" variant="positive" />
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenReceipt(pmt)}
                              className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Kvitansiya</span>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Amallar</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingPayment(pmt);
                                    setFormDialogOpen(true);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Edit className="w-4 h-4 mr-2 text-muted-foreground" />
                                  <span>Tahrirlash</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPaymentToDelete(pmt);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  <span>O‘chirish</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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

      {/* Form Dialog */}
      <PaymentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        payment={editingPayment}
        groups={groups}
        students={students}
        onSave={handleSavePayment}
      />

      {/* Receipt Modal */}
      <PaymentReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        payment={receiptPayment}
        student={students.find((s) => s.id === receiptPayment?.student_id) || null}
        group={groups.find((g) => g.id === receiptPayment?.group_id) || null}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="To‘lovni o‘chirishni tasdiqlaysizmi?"
        description="Ushbu to‘lov yozuvi o‘chirilsa, o‘quvchining qarzdorlik balansi qayta hisoblanadi."
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        onConfirm={handleDeletePayment}
      />
    </div>
  );
}
