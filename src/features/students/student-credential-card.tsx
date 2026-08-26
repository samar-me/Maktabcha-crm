"use client";

import * as React from "react";
import {
  getStudentCredentialStatusAction,
  generateStudentPasswordAction,
  setCustomStudentPasswordAction,
} from "@/actions/student-credentials";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Loader2,
  Lock,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

interface StudentCredentialCardProps {
  studentId: string;
  studentName: string;
}

export function StudentCredentialCard({ studentId, studentName }: StudentCredentialCardProps) {
  const [hasPassword, setHasPassword] = React.useState<boolean | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);

  // One-time Reveal Dialog
  const [revealDialogOpen, setRevealDialogOpen] = React.useState(false);
  const [generatedPassword, setGeneratedPassword] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  // Custom Password Dialog
  const [customDialogOpen, setCustomDialogOpen] = React.useState(false);
  const [customPasswordInput, setCustomPasswordInput] = React.useState("");

  const loadStatus = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await getStudentCredentialStatusAction(studentId);
      setHasPassword(res.hasPassword);
      setUpdatedAt(res.updatedAt);
    } catch {
      setHasPassword(false);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleGenerateNumeric = async () => {
    setActionLoading(true);
    try {
      const res = await generateStudentPasswordAction(studentId);
      if (res.success && res.plaintextPassword) {
        setGeneratedPassword(res.plaintextPassword);
        setRevealDialogOpen(true);
        await loadStatus();
        toast.success("Yangi 6 xonali parol muvaffaqiyatli yaratildi");
      } else {
        toast.error(res.error || "Parol yaratishda xatolik yuz berdi");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetCustomPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPasswordInput || customPasswordInput.length < 4) {
      toast.error("Parol kamida 4 ta belgidan iborat bo‘lishi kerak");
      return;
    }

    setActionLoading(true);
    try {
      const res = await setCustomStudentPasswordAction(studentId, customPasswordInput);
      if (res.success) {
        setCustomDialogOpen(false);
        setCustomPasswordInput("");
        await loadStatus();
        toast.success("Maxsus parol muvaffaqiyatli saqlandi");
      } else {
        toast.error(res.error || "Parolni saqlashda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    toast.success("Parol nusxalandi");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Card className="shadow-sm border-blue-100 dark:border-blue-950/60 bg-blue-50/10 dark:bg-blue-950/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <KeyRound className="w-5 h-5 shrink-0" />
              <CardTitle className="text-base font-bold">Topshiriqlar uchun shaxsiy parol</CardTitle>
            </div>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : hasPassword ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>O‘rnatilgan</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>O‘rnatilmagan</span>
              </span>
            )}
          </div>
          <CardDescription className="text-xs">
            Telegram Mini App orqali test va topshiriqlarni ishlash uchun o‘quvchining shaxsiy kirish kodi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-foreground">
                {hasPassword ? "Parol faol holatda" : "Hali parol o‘rnatilmagan"}
              </p>
              <p className="text-muted-foreground">
                {hasPassword && updatedAt
                  ? `So‘nggi o‘zgartirish: ${formatDate(updatedAt, "d-MMMM, yyyy HH:mm")}`
                  : "O‘quvchi test topshirishi uchun unga 6 xonali kod yoki maxsus parol bering."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant={hasPassword ? "outline" : "default"}
                onClick={handleGenerateNumeric}
                disabled={actionLoading}
                className="gap-1.5 text-xs h-9"
              >
                {actionLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{hasPassword ? "Yangi 6 xonali kod" : "6 xonali kod yaratish"}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCustomDialogOpen(true)}
                disabled={actionLoading}
                className="text-xs h-9"
              >
                <span>O‘zim kiritish</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* One-time Password Reveal Dialog */}
      <Dialog open={revealDialogOpen} onOpenChange={setRevealDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center font-bold text-lg">
              {studentName} uchun yangi parol
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Ushbu parol faqat bir marta ko‘rsatiladi. Uni o‘quvchiga taqdim eting:
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 p-4 rounded-2xl bg-muted/70 border-2 border-dashed border-blue-200 dark:border-blue-900/60 flex items-center justify-center gap-3">
            <span className="font-mono text-3xl font-black tracking-widest text-blue-600 dark:text-blue-400">
              {generatedPassword}
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleCopyPassword}
              className="h-10 w-10 shrink-0 rounded-xl"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
            ⚠️ <b>Eslatma:</b> Xavfsizlik maqsadida parol bazada shifrlanadi. Ushbu oynani yopgach, parolni qayta ko‘rib bo‘lmaydi.
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setRevealDialogOpen(false)}
              className="w-full h-10 font-semibold"
            >
              Tushundim va nusxaladim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Password Dialog */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSetCustomPassword}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Maxsus parol o‘rnatish</DialogTitle>
              <DialogDescription className="text-xs">
                {studentName} uchun o‘zingiz xohlagan parolni belgilang (kamida 4 ta belgi)
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-2">
              <Label htmlFor="customPassword">Yangi parol</Label>
              <Input
                id="customPassword"
                type="text"
                placeholder="Masalan: 123456 yoki parol123"
                value={customPasswordInput}
                onChange={(e) => setCustomPasswordInput(e.target.value)}
                autoFocus
                className="h-10 text-sm font-medium"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomDialogOpen(false)}
                disabled={actionLoading}
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={actionLoading} className="gap-2">
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Saqlash</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
