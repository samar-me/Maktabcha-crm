"use client";

import * as React from "react";
import { Homework, Student, HomeworkStatus } from "@/types/database";
import { getHomeworkSubmissions, saveBatchHomeworkGrading } from "@/services/homework";
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
import { Check, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface HomeworkGradingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homework: Homework | null;
  students: Student[];
  onSaved?: () => void;
}

interface SubmissionRow {
  student_id: string;
  student: Student;
  status: HomeworkStatus;
  score: number | string;
  feedback: string;
}

export function HomeworkGradingDialog({
  open,
  onOpenChange,
  homework,
  students,
  onSaved,
}: HomeworkGradingDialogProps) {
  const [rows, setRows] = React.useState<SubmissionRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);

  React.useEffect(() => {
    if (!homework || !open) return;

    async function loadSubmissions() {
      if (!homework) return;
      try {
        setFetching(true);
        const existingSubmissions = await getHomeworkSubmissions({ homeworkId: homework.id });

        const initialRows: SubmissionRow[] = students.map((st) => {
          const sub = existingSubmissions.find((s) => s.student_id === st.id);
          return {
            student_id: st.id,
            student: st,
            status: sub ? sub.status : "Berildi",
            score: sub?.score !== null && sub?.score !== undefined ? sub.score : "",
            feedback: sub?.feedback || "",
          };
        });

        setRows(initialRows);
      } catch {
        toast.error("Vazifa natijalarini yuklashda xatolik");
      } finally {
        setFetching(false);
      }
    }

    loadSubmissions();
  }, [homework, students, open]);

  // Bulk action: Mark all as completed
  const handleMarkAllCompleted = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        status: "Bajarildi",
        score: r.score === "" ? "100" : r.score,
      }))
    );
    toast.success("Barcha o‘quvchilar «Bajarildi» deb belgilandi.");
  };

  const handleSetStatus = (studentId: string, status: HomeworkStatus) => {
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    );
  };

  const handleSetScore = (studentId: string, score: string) => {
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, score } : r))
    );
  };

  const handleSetFeedback = (studentId: string, feedback: string) => {
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, feedback } : r))
    );
  };

  const handleSave = async () => {
    if (!homework) return;
    setLoading(true);
    try {
      await saveBatchHomeworkGrading(
        homework.id,
        rows.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          score: r.score !== "" ? Number(r.score) : null,
          feedback: r.feedback || null,
        }))
      );
      toast.success("Vazifa natijalari muvaffaqiyatli saqlandi!");
      if (onSaved) onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Natijalarni saqlashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const completedCount = rows.filter((r) => r.status === "Bajarildi").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Uy Vazifasini Tekshirish & Baholash
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            <strong className="text-foreground">{homework?.title}</strong> &bull; Topshirganlar: {completedCount} / {students.length} nafar
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-xs">Topshiriqlar yuklanmoqda...</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Top Actions */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <span className="text-xs text-muted-foreground">
                Barcha o‘quvchilar holatini tezkor belgilang:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkAllCompleted}
                className="gap-1.5 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 hover:bg-emerald-100"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Barchasi bajardi</span>
              </Button>
            </div>

            {/* Student rows */}
            <div className="divide-y divide-border">
              {rows.map((r, idx) => (
                <div key={r.student_id} className="py-3 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-muted-foreground font-mono w-4">{idx + 1}.</span>
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                        {r.student.first_name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {r.student.first_name} {r.student.last_name || ""}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {r.student.phone || "Telefon yo‘q"}
                        </p>
                      </div>
                    </div>

                    {/* 4 Status Buttons */}
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetStatus(r.student_id, "Bajarildi")}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                          r.status === "Bajarildi"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Bajarildi
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetStatus(r.student_id, "Qisman")}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                          r.status === "Qisman"
                            ? "bg-amber-600 text-white shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Qisman
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetStatus(r.student_id, "Bajarilmadi")}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                          r.status === "Bajarilmadi"
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Bajarilmadi
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetStatus(r.student_id, "Berildi")}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                          r.status === "Berildi"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Berildi
                      </button>
                    </div>
                  </div>

                  {/* Score & Feedback Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pl-6">
                    <div className="sm:col-span-1">
                      <Input
                        type="number"
                        value={r.score}
                        onChange={(e) => handleSetScore(r.student_id, e.target.value)}
                        placeholder="Ball (0-100)"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        value={r.feedback}
                        onChange={(e) => handleSetFeedback(r.student_id, e.target.value)}
                        placeholder="O‘qituvchi izohi / taqrizi (ixtiyoriy)..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Bekor qilish
          </Button>
          <Button size="sm" onClick={handleSave} disabled={loading || fetching} className="gap-1.5">
            <Save className="w-4 h-4" />
            <span>{loading ? "Saqlanmoqda..." : "Natijalarni saqlash"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
