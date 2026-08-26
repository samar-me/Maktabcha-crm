"use client";

import * as React from "react";
import { Payment, Group, Student } from "@/types/database";
import { crmStore } from "@/services/crm-store";
import { PaymentFormDialog } from "./payment-form-dialog";
import { PaymentReceiptDialog } from "./payment-receipt-dialog";
import { PaymentFormValues } from "./payment-schema";
import { StatCard } from "@/components/shared/stat-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { excelExport } from "@/lib/excel-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  Calendar,
  Wallet,
  FileSpreadsheet,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

export function PaymentListView() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");
  const [methodFilter, setMethodFilter] = React.useState<string>("all");

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingPayment, setEditingPayment] = React.useState<Payment | null>(null);

  const [receiptDialogOpen, setReceiptDialogOpen] = React.useState(false);
  const [receiptPayment, setReceiptPayment] = React.useState<Payment | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [paymentToDelete, setPaymentToDelete] = React.useState<Payment | null>(null);

  const loadData = React.useCallback(() => {
    setPayments(crmStore.getPayments());
    setGroups(crmStore.getGroups());
    setStudents(crmStore.getStudents());
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

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
      crmStore.savePayment({
        id,
        student_id: values.student_id,
        group_id: values.group_id,
        amount: values.amount,
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        month: values.month,
        year: values.year,
        note: values.note || null,
      });

      toast.success(id ? "To‘lov ma'lumotlari yangilandi" : "To‘lov qabul qilindi");
      loadData();
    } catch {
      toast.error("To‘lovni saqlashda xatolik yuz berdi");
    }
  };

  const handleDeletePayment = () => {
    if (!paymentToDelete) return;
    try {
      crmStore.deletePayment(paymentToDelete.id);
      toast.success("To‘lov o‘chirildi");
      setDeleteConfirmOpen(false);
      setPaymentToDelete(null);
      loadData();
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

  // Financial summary
  const summary = crmStore.getMonthlyFinancialSummary();
  const totalAmountFiltered = filteredPayments.reduce((acc, p) => acc + Number(p.amount), 0);

  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
  ];

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Bu oylik jami tushum"
          value={<MoneyDisplay amount={summary.totalCollected} size="lg" variant="positive" />}
          icon={Wallet}
          subtitle={`Yig‘ish ko‘rsatkichi: ${summary.collectionRate}%`}
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <StatCard
          title="Kutilayotgan tushum"
          value={<MoneyDisplay amount={summary.totalExpected} size="lg" />}
          icon={TrendingUp}
          subtitle="Guruhlar bo‘yicha to‘liq oylik reja"
          iconColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="Qarzdorlik miqdori"
          value={<MoneyDisplay amount={summary.totalDebt} size="lg" variant="negative" />}
          icon={CreditCard}
          subtitle={`${summary.debtorsCount} nafar qarzdor o‘quvchi`}
          iconColorClass="text-rose-600 dark:text-rose-400"
          iconBgClass="bg-rose-50 dark:bg-rose-950/50"
        />
        <StatCard
          title="Jami to‘lovlar soni"
          value={`${filteredPayments.length} ta`}
          icon={Receipt}
          subtitle={`Jami summa: ${formatCurrency(totalAmountFiltered)}`}
          iconColorClass="text-purple-600 dark:text-purple-400"
          iconBgClass="bg-purple-50 dark:bg-purple-950/50"
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
              placeholder="O‘quvchi ismi yoki kvitansiya izohi bo‘yicha qidirish..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex gap-2">
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

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              aria-label="To‘lov usuli bo‘yicha filtrlash"
              className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Barcha usullar</option>
              <option value="Karta">Karta</option>
              <option value="Naqd">Naqd</option>
              <option value="O‘tkazma">O‘tkazma</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="gap-2 shrink-0 text-xs h-9"
            size="sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excelga yuklash</span>
          </Button>

          <Button
            onClick={() => {
              setEditingPayment(null);
              setFormDialogOpen(true);
            }}
            className="gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-xs h-9"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            <span>To‘lov qabul qilish</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      {filteredPayments.length === 0 ? (
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
        <Card className="shadow-sm overflow-hidden border-border/80">
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
