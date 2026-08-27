"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentSchema, PaymentFormValues } from "./payment-schema";
import { Payment, Group, Student } from "@/types/database";
import { getGroupsByStudentId } from "@/services/groups";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import { CreditCard, Banknote, Landmark, Loader2 } from "lucide-react";

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment | null;
  groups: Group[];
  students: Student[];
  initialStudentId?: string;
  initialGroupId?: string;
  onSave: (values: PaymentFormValues, id?: string) => Promise<void> | void;
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  payment,
  groups,
  students,
  initialStudentId,
  initialGroupId,
  onSave,
}: PaymentFormDialogProps) {
  const isEditing = !!payment;
  const [loading, setLoading] = React.useState(false);
  const [studentGroups, setStudentGroups] = React.useState<Group[]>(groups);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      student_id: initialStudentId || (students[0]?.id || ""),
      group_id: initialGroupId || (groups[0]?.id || ""),
      amount: 400000,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "Karta",
      month: currentMonth,
      year: currentYear,
      note: "",
    },
  });

  const selectedStudentId = watch("student_id");
  const selectedGroupId = watch("group_id");
  const selectedMethod = watch("payment_method");
  const selectedMonth = watch("month");
  const selectedYear = watch("year");

  React.useEffect(() => {
    async function updateStudentGroups() {
      if (!selectedStudentId) {
        setStudentGroups(groups);
        return;
      }
      try {
        const enrolled = await getGroupsByStudentId(selectedStudentId);
        setStudentGroups(enrolled.length > 0 ? enrolled : groups);
      } catch {
        setStudentGroups(groups);
      }
    }
    updateStudentGroups();
  }, [selectedStudentId, groups]);

  // NEW: State to hold the active discount
  const [activeDiscount, setActiveDiscount] = React.useState<any>(null);

  React.useEffect(() => {
    async function initForm() {
      if (payment) {
        reset({
          student_id: payment.student_id,
          group_id: payment.group_id,
          amount: payment.amount,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          month: payment.month,
          year: payment.year,
          note: payment.note || "",
        });
        setActiveDiscount(null);
      } else {
        const studentIdToUse = initialStudentId || (students[0]?.id || "");
        let groupIdToUse = initialGroupId || "";

        if (!groupIdToUse && studentIdToUse) {
          try {
            const enrolled = await getGroupsByStudentId(studentIdToUse);
            if (enrolled.length > 0) {
              groupIdToUse = enrolled[0].id;
            }
          } catch {}
        }
        if (!groupIdToUse && groups.length > 0) {
          groupIdToUse = groups[0].id;
        }

        const selectedGroup = groups.find((g) => g.id === groupIdToUse);
        let baseAmount = selectedGroup ? Number(selectedGroup.monthly_fee) : 400000;
        
        let foundDiscount = null;
        if (studentIdToUse) {
          try {
             // We dynamically import here to avoid needing to add it to top-level if not needed, 
             // but better to import at top. Let's assume we add it to the top.
             const { getUnusedDiscount } = await import("@/services/discounts");
             foundDiscount = await getUnusedDiscount(studentIdToUse);
             if (foundDiscount) {
                baseAmount = baseAmount - (baseAmount * (foundDiscount.discount_percentage / 100));
             }
          } catch (e) {
             console.error(e);
          }
        }
        
        setActiveDiscount(foundDiscount);

        reset({
          student_id: studentIdToUse,
          group_id: groupIdToUse,
          amount: baseAmount,
          payment_date: new Date().toISOString().split("T")[0],
          payment_method: "Karta",
          month: currentMonth,
          year: currentYear,
          note: foundDiscount ? `Chegirma: ${foundDiscount.reason} (${foundDiscount.discount_percentage}%)` : "",
          discount_id: foundDiscount ? foundDiscount.id : null,
        });
      }
    }
    initForm();
  }, [payment, initialStudentId, initialGroupId, groups, students, reset, open, currentMonth, currentYear]);

  const onSubmit = async (values: PaymentFormValues) => {
    setLoading(true);
    try {
      await onSave(values, payment?.id);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const months = [
    { value: 1, label: "Yanvar" },
    { value: 2, label: "Fevral" },
    { value: 3, label: "Mart" },
    { value: 4, label: "Aprel" },
    { value: 5, label: "May" },
    { value: 6, label: "Iyun" },
    { value: 7, label: "Iyul" },
    { value: 8, label: "Avgust" },
    { value: 9, label: "Sentabr" },
    { value: 10, label: "Oktabr" },
    { value: 11, label: "Noyabr" },
    { value: 12, label: "Dekabr" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold">
            {isEditing ? "To‘lov ma'lumotlarini tahrirlash" : "To‘lov qabul qilish"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            O‘quvchi, guruh, to‘lov summasi, usuli va hisob davrini kiriting
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Student & Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                O‘quvchi <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedStudentId}
                onValueChange={async (val) => {
                  setValue("student_id", val);
                  try {
                    const enrolled = await getGroupsByStudentId(val);
                    if (enrolled.length > 0) {
                      setValue("group_id", enrolled[0].id);
                      setValue("amount", Number(enrolled[0].monthly_fee));
                    }
                  } catch {}
                }}
              >
                <SelectTrigger className="h-10 sm:h-9 text-base sm:text-xs">
                  <SelectValue placeholder="O‘quvchini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((st) => (
                    <SelectItem key={st.id} value={st.id} className="text-xs">
                      {st.first_name} {st.last_name || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.student_id && (
                <p className="text-xs text-destructive">{errors.student_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Guruh <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedGroupId}
                onValueChange={(val) => {
                  setValue("group_id", val);
                  const grp = groups.find((g) => g.id === val);
                  if (grp) setValue("amount", Number(grp.monthly_fee));
                }}
              >
                <SelectTrigger className="h-10 sm:h-9 text-base sm:text-xs">
                  <SelectValue placeholder="Guruhni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {studentGroups.map((grp) => (
                    <SelectItem key={grp.id} value={grp.id} className="text-xs">
                      {grp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.group_id && (
                <p className="text-xs text-destructive">{errors.group_id.message}</p>
              )}
            </div>
          </div>

          {/* Amount & Preset Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount" className="text-xs font-semibold">
                To‘lov summasi (so‘m) <span className="text-destructive">*</span>
              </Label>
              {selectedGroup && (
                <button
                  type="button"
                  onClick={() => setValue("amount", Number(selectedGroup.monthly_fee))}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Tarif: {formatCurrency(selectedGroup.monthly_fee)}
                </button>
              )}
            </div>
            <Input
              id="amount"
              type="number"
              inputMode="numeric"
              step="5000"
              disabled={loading}
              className="text-base sm:text-sm h-10 sm:h-9 font-mono"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Payment Method Segmented Buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">To‘lov usuli</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setValue("payment_method", "Karta")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
                  selectedMethod === "Karta"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-background border-input text-foreground hover:bg-muted"
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Karta</span>
              </button>

              <button
                type="button"
                onClick={() => setValue("payment_method", "Naqd")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
                  selectedMethod === "Naqd"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-background border-input text-foreground hover:bg-muted"
                }`}
              >
                <Banknote className="w-4 h-4 shrink-0" />
                <span>Naqd</span>
              </button>

              <button
                type="button"
                onClick={() => setValue("payment_method", "O‘tkazma")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
                  selectedMethod === "O‘tkazma"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-background border-input text-foreground hover:bg-muted"
                }`}
              >
                <Landmark className="w-4 h-4 shrink-0" />
                <span>O‘tkazma</span>
              </button>
            </div>
          </div>

          {/* Month, Year & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">To‘lov oyi</Label>
              <Select
                value={String(selectedMonth)}
                onValueChange={(val) => setValue("month", Number(val))}
              >
                <SelectTrigger className="h-10 sm:h-9 text-base sm:text-xs">
                  <SelectValue placeholder="Oy" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="year" className="text-xs font-semibold">Yili</Label>
              <Input
                id="year"
                type="number"
                inputMode="numeric"
                disabled={loading}
                className="h-10 sm:h-9 text-base sm:text-xs font-mono"
                {...register("year")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment_date" className="text-xs font-semibold">
                Sana <span className="text-destructive">*</span>
              </Label>
              <Input
                id="payment_date"
                type="date"
                disabled={loading}
                className="h-10 sm:h-9 text-base sm:text-xs"
                {...register("payment_date")}
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs font-semibold">Kvitansiya izohi (ixtiyoriy)</Label>
            <Input
              id="note"
              placeholder="Masalan: Click / Payme chek raqami yoki eslatma..."
              disabled={loading}
              className="h-10 sm:h-9 text-base sm:text-xs"
              {...register("note")}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-10 sm:h-9 text-xs"
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 h-10 sm:h-9 text-xs font-semibold">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : isEditing ? (
                "O‘zgarishlarni saqlash"
              ) : (
                "To‘lovni qabul qilish"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
