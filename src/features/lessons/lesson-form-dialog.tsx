"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { lessonSchema, LessonFormValues } from "./lesson-schema";
import { Lesson, Group } from "@/types/database";
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

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: Lesson | null;
  groups: Group[];
  initialGroupId?: string;
  onSave: (values: LessonFormValues, id?: string) => Promise<void> | void;
}

export function LessonFormDialog({
  open,
  onOpenChange,
  lesson,
  groups,
  initialGroupId,
  onSave,
}: LessonFormDialogProps) {
  const isEditing = !!lesson;
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      group_id: initialGroupId || (groups[0]?.id || ""),
      date: new Date().toISOString().split("T")[0],
      start_time: "14:00",
      end_time: "16:00",
      topic: "",
      description: "",
      homework: "",
      status: "Rejalashtirilgan",
    },
  });

  const selectedGroupId = watch("group_id");
  const selectedStatus = watch("status");

  React.useEffect(() => {
    if (lesson) {
      reset({
        group_id: lesson.group_id,
        date: lesson.date,
        start_time: lesson.start_time,
        end_time: lesson.end_time,
        topic: lesson.topic,
        description: lesson.description || "",
        homework: lesson.homework || "",
        status: lesson.status,
      });
    } else {
      reset({
        group_id: initialGroupId || (groups[0]?.id || ""),
        date: new Date().toISOString().split("T")[0],
        start_time: "14:00",
        end_time: "16:00",
        topic: "",
        description: "",
        homework: "",
        status: "Rejalashtirilgan",
      });
    }
  }, [lesson, initialGroupId, groups, reset, open]);

  const onSubmit = async (values: LessonFormValues) => {
    setLoading(true);
    try {
      await onSave(values, lesson?.id);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? "Dars ma'lumotlarini tahrirlash" : "Yangi dars rejalashtirish"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Dars sanasi, vaqti, mavzusi va beriladigan uy vazifasini kiriting
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Group & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Guruh <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedGroupId}
                onValueChange={(val) => setValue("group_id", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Guruhni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((grp) => (
                    <SelectItem key={grp.id} value={grp.id}>
                      {grp.name} ({grp.course_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.group_id && (
                <p className="text-xs text-destructive">{errors.group_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Dars holati</Label>
              <Select
                value={selectedStatus}
                onValueChange={(val: any) => setValue("status", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Holatni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rejalashtirilgan">Rejalashtirilgan</SelectItem>
                  <SelectItem value="O‘tkazildi">O‘tkazildi</SelectItem>
                  <SelectItem value="Bekor qilindi">Bekor qilindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date">
                Dars sanasi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                disabled={loading}
                {...register("date")}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start_time">
                Boshlanish vaqti <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start_time"
                type="time"
                disabled={loading}
                {...register("start_time")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end_time">
                Tugash vaqti <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end_time"
                type="time"
                disabled={loading}
                {...register("end_time")}
              />
            </div>
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <Label htmlFor="topic">
              Dars mavzusi <span className="text-destructive">*</span>
            </Label>
            <Input
              id="topic"
              placeholder="Masalan: React Hooks va Lifecycle metodlari"
              disabled={loading}
              {...register("topic")}
            />
            {errors.topic && (
              <p className="text-xs text-destructive">{errors.topic.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Dars tafsilotlari / Reja (ixtiyoriy)</Label>
            <Input
              id="description"
              placeholder="Darsda nimalar o‘rganilishi haqida qisqacha..."
              disabled={loading}
              {...register("description")}
            />
          </div>

          {/* Homework */}
          <div className="space-y-1.5">
            <Label htmlFor="homework">Uyga vazifa (ixtiyoriy)</Label>
            <Input
              id="homework"
              placeholder="Masalan: 5 ta amaliy topshiriqni bajarish..."
              disabled={loading}
              {...register("homework")}
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
              {loading ? "Saqlanmoqda..." : isEditing ? "O‘zgarishlarni saqlash" : "Darsni saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
