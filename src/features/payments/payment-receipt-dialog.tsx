"use client";

import * as React from "react";
import { Payment, Student, Group } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/shared/money-display";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Printer, CheckCircle2, GraduationCap } from "lucide-react";

interface PaymentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  student: Student | null;
  group: Group | null;
}

export function PaymentReceiptDialog({
  open,
  onOpenChange,
  payment,
  student,
  group,
}: PaymentReceiptDialogProps) {
  if (!payment || !student) return null;

  const receiptNumber = `KVI-${payment.year}-${String(payment.month).padStart(2, "0")}-${payment.id.slice(-4).toUpperCase()}`;

  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md print:shadow-none print:border-none p-0 overflow-hidden">
        <div className="p-6 space-y-5 bg-card text-foreground">
          {/* Header */}
          <div className="text-center pb-4 border-b border-border space-y-1">
            <div className="inline-flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-lg">
              <GraduationCap className="w-6 h-6" />
              <span>Maktabcha CRM</span>
            </div>
            <p className="text-xs text-muted-foreground">O‘quv Markazi Rasmiy To‘lov Kvitansiyasi</p>
            <div className="pt-2">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-muted">
                {receiptNumber}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">O‘quvchi:</span>
              <span className="font-bold text-foreground">
                {student.first_name} {student.last_name || ""}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Telefon:</span>
              <span className="font-mono text-foreground">{student.phone || "—"}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Guruh:</span>
              <span className="font-semibold text-foreground">
                {group?.name || "Guruh"} ({group?.course_name || ""})
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">To‘lov davri:</span>
              <span className="font-medium text-foreground">
                {monthNames[payment.month - 1]} oyi, {payment.year}-yil
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">To‘lov usuli:</span>
              <span className="font-medium text-foreground">{payment.payment_method}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">To‘lov sanasi:</span>
              <span className="font-mono text-foreground">{formatDate(payment.payment_date)}</span>
            </div>

            {payment.note && (
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Izoh:</span>
                <span className="text-foreground text-right">{payment.note}</span>
              </div>
            )}

            {/* Total Amount Box */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between mt-4">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                To‘langan summa:
              </span>
              <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(payment.amount)}
              </span>
            </div>
          </div>

          {/* Status Badge & Stamp */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>To‘lov qabul qilindi</span>
            </div>
            <span>Kassir: Administrator</span>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Yopish
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" />
            <span>Chop etish</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
