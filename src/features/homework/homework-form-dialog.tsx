"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { homeworkSchema, HomeworkFormValues } from "./homework-schema";
import { Homework, Group, Lesson } from "@/types/database";
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

interface HomeworkFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homework?: Homework | null;
  groups: Group[];
  lessons: Lesson[];
  initialGroupId?: string;
  onSave: (values: HomeworkFormValues, id?: string) => Promise<void> | void;
}

export function HomeworkFormDialog({
  open,
  onOpenChange,
  homework,
  groups,
  lessons,
  initialGroupId,
  onSave,
}: HomeworkFormDialogProps) {
  const isEditing = !!homework;
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HomeworkFormValues>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: {
      group_id: initialGroupId || (groups[0]?.id || ""),
      lesson_id: "",
      title: "",
      description: "",
      assigned_date: new Date().toISOString().split("T")[0],
      due_date: "",
    },
  });

  const selectedGroupId = watch("group_id");
  const filteredLessons = lessons.filter((l) => l.group_id === selectedGroupId);

  React.useEffect(() => {
    if (homework) {
      reset({
        group_id: homework.group_id,
        lesson_id: homework.lesson_id || "",
        title: homework.title,
        description: homework.description || "",
        assigned_date: homework.assigned_date,
        due_date: homework.due_date || "",
      });
    } else {
      reset({
        group_id: initialGroupId || (groups[0]?.id || ""),
        lesson_id: "",
        title: "",
        description: "",
        assigned_date: new Date().toISOString().split("T")[0],
        due_date: "",
      });
    }
  }, [homework, initialGroupId, groups, reset, open]);

  const onSubmit = async (values: HomeworkFormValues) => {
    setLoading(true);
    try {
      await onSave(values, homework?.id);
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
            {isEditing ? "Vazifani tahrirlash" : "Yangi uy vazifasi berish"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Guruh, dars, topshiriq sarlavhasi va topshirish muddatini belgilang
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Group */}
          <div className="space-y-1.5">
            <Label>
              Guruh <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedGroupId}
              onValueChange={(val) => {
                setValue("group_id", val);
                setValue("lesson_id", "");
              }}
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

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Topshiriq nomi <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Masalan: React Props & State amaliy loyihasi"
              disabled={loading}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Topshiriq tavsifi / Talablar</Label>
            <Input
              id="description"
              placeholder="O‘quvchilar nimalarni bajarishi kerakligi haqida..."
              disabled={loading}
              {...register("description")}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="assigned_date">
                Berilgan sana <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assigned_date"
                type="date"
                disabled={loading}
                {...register("assigned_date")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_date">Topshirish oxirgi muddati</Label>
              <Input
                id="due_date"
                type="date"
                disabled={loading}
                {...register("due_date")}
              />
            </div>
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
              {loading ? "Saqlanmoqda..." : isEditing ? "O‘zgarishlarni saqlash" : "Vazifani berish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
