"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { gradeSchema, GradeFormValues } from "./grade-schema";
import { Grade, Group, Student, Lesson } from "@/types/database";
import { getStudentsByGroupId } from "@/services/groups";
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

interface GradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade?: Grade | null;
  groups: Group[];
  students: Student[];
  lessons: Lesson[];
  initialGroupId?: string;
  initialStudentId?: string;
  onSave: (values: GradeFormValues, id?: string) => Promise<void> | void;
}

export function GradeFormDialog({
  open,
  onOpenChange,
  grade,
  groups,
  students,
  lessons,
  initialGroupId,
  initialStudentId,
  onSave,
}: GradeFormDialogProps) {
  const isEditing = !!grade;
  const [loading, setLoading] = React.useState(false);
  const [groupStudents, setGroupStudents] = React.useState<Student[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      student_id: initialStudentId || (students[0]?.id || ""),
      group_id: initialGroupId || (groups[0]?.id || ""),
      lesson_id: "",
      title: "Oraliq nazorat",
      score: 90,
      max_score: 100,
      date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const selectedGroupId = watch("group_id");
  const selectedStudentId = watch("student_id");
  const currentScore = Number(watch("score")) || 0;
  const currentMaxScore = Number(watch("max_score")) || 100;
  const percentage = currentMaxScore > 0 ? Math.round((currentScore / currentMaxScore) * 100) : 0;

  React.useEffect(() => {
    async function updateStudents() {
      if (!selectedGroupId) {
        setGroupStudents(students);
        return;
      }
      try {
        const grpSt = await getStudentsByGroupId(selectedGroupId);
        setGroupStudents(grpSt.length > 0 ? grpSt : students);
      } catch {
        setGroupStudents(students);
      }
    }
    updateStudents();
  }, [selectedGroupId, students]);

  React.useEffect(() => {
    if (grade) {
      reset({
        student_id: grade.student_id,
        group_id: grade.group_id,
        lesson_id: grade.lesson_id || "",
        title: grade.title,
        score: grade.score,
        max_score: grade.max_score || 100,
        date: grade.date,
        notes: grade.notes || "",
      });
    } else {
      reset({
        student_id: initialStudentId || (students[0]?.id || ""),
        group_id: initialGroupId || (groups[0]?.id || ""),
        lesson_id: "",
        title: "Oraliq nazorat",
        score: 90,
        max_score: 100,
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    }
  }, [grade, initialGroupId, initialStudentId, groups, students, reset, open]);

  const onSubmit = async (values: GradeFormValues) => {
    setLoading(true);
    try {
      await onSave(values, grade?.id);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? "Bahoni tahrirlash" : "Yangi baho / sinov natijasini kiritish"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            O‘quvchi, guruh, test/nazorat nomi va olingan ballni kiriting
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Group & Student */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Guruh <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedGroupId}
                onValueChange={async (val) => {
                  setValue("group_id", val);
                  try {
                    const grpSt = await getStudentsByGroupId(val);
                    if (grpSt.length > 0) {
                      setValue("student_id", grpSt[0].id);
                    }
                  } catch {}
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Guruhni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((grp) => (
                    <SelectItem key={grp.id} value={grp.id}>
                      {grp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                O‘quvchi <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedStudentId}
                onValueChange={(val) => setValue("student_id", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="O‘quvchini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {groupStudents.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.first_name} {st.last_name || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.student_id && (
                <p className="text-xs text-destructive">{errors.student_id.message}</p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Nazorat / Sinov nomi <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Masalan: Oraliq nazorat #1 yoki Yakuniy imtihon"
              disabled={loading}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="score" className="text-xs font-semibold">
                To‘plangan ball <span className="text-destructive">*</span>
              </Label>
              <Input
                id="score"
                type="number"
                inputMode="numeric"
                disabled={loading}
                className="h-10 sm:h-9 text-base sm:text-xs font-mono"
                {...register("score")}
              />
              {errors.score && (
                <p className="text-xs text-destructive">{errors.score.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="max_score" className="text-xs font-semibold">Maksimal ball</Label>
              <Input
                id="max_score"
                type="number"
                inputMode="numeric"
                disabled={loading}
                className="h-10 sm:h-9 text-base sm:text-xs font-mono"
                {...register("max_score")}
              />
            </div>
          </div>

          {/* Percentage Live Preview */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">O‘zlashtirish foizi:</span>
            <span className="font-bold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded-lg">
              {currentScore} / {currentMaxScore} ({percentage}%)
            </span>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date">
              Baholash sanasi <span className="text-destructive">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              disabled={loading}
              {...register("date")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Izoh yoki tavsiya (ixtiyoriy)</Label>
            <Input
              id="notes"
              placeholder="O‘quvchi natijasi haqida qisqacha izoh..."
              disabled={loading}
              {...register("notes")}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saqlanmoqda..." : isEditing ? "O‘zgarishlarni saqlash" : "Bahoni saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
