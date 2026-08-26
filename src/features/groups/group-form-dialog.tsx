"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { groupSchema, GroupFormValues } from "./group-schema";
import { Group, ScheduleItem } from "@/types/database";
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
import { Plus, Trash2, Calendar, Clock } from "lucide-react";

interface GroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: Group | null;
  onSave: (values: GroupFormValues, id?: string) => Promise<void> | void;
}

const WEEKDAYS = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
];

export function GroupFormDialog({
  open,
  onOpenChange,
  group,
  onSave,
}: GroupFormDialogProps) {
  const isEditing = !!group;
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      course_name: "",
      teacher_name: "",
      monthly_fee: 400000,
      room: "Xona 101",
      start_date: new Date().toISOString().split("T")[0],
      status: "Faol",
      schedule: [
        { day: "Dushanba", start_time: "14:00", end_time: "16:00" },
        { day: "Chorshanba", start_time: "14:00", end_time: "16:00" },
        { day: "Juma", start_time: "14:00", end_time: "16:00" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "schedule",
  });

  const selectedStatus = watch("status");

  React.useEffect(() => {
    if (group) {
      const scheduleArray = Array.isArray(group.schedule)
        ? (group.schedule as ScheduleItem[])
        : [];
      reset({
        name: group.name,
        course_name: group.course_name,
        teacher_name: group.teacher_name,
        monthly_fee: group.monthly_fee,
        room: group.room || "",
        start_date: group.start_date,
        status: group.status,
        schedule: scheduleArray.length > 0
          ? scheduleArray
          : [{ day: "Dushanba", start_time: "14:00", end_time: "16:00" }],
      });
    } else {
      reset({
        name: "",
        course_name: "",
        teacher_name: "",
        monthly_fee: 400000,
        room: "Xona 101",
        start_date: new Date().toISOString().split("T")[0],
        status: "Faol",
        schedule: [
          { day: "Dushanba", start_time: "14:00", end_time: "16:00" },
          { day: "Chorshanba", start_time: "14:00", end_time: "16:00" },
          { day: "Juma", start_time: "14:00", end_time: "16:00" },
        ],
      });
    }
  }, [group, reset, open]);

  const onSubmit = async (values: GroupFormValues) => {
    setLoading(true);
    try {
      await onSave(values, group?.id);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? "Guruh ma'lumotlarini tahrirlash" : "Yangi guruh ochish"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Guruh nomi, kursi, o‘qituvchi, oylik to‘lov tarifi va dars jadvalini belgilang
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Group Name & Course */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Guruh nomi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Masalan: Frontend-02"
                disabled={loading}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course_name">
                Kurs / Fan nomi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="course_name"
                placeholder="Masalan: Web Dasturlash (Frontend)"
                disabled={loading}
                {...register("course_name")}
              />
              {errors.course_name && (
                <p className="text-xs text-destructive">{errors.course_name.message}</p>
              )}
            </div>
          </div>

          {/* Teacher & Monthly Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="teacher_name">
                O‘qituvchi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="teacher_name"
                placeholder="Masalan: Anvar Qodirov"
                disabled={loading}
                {...register("teacher_name")}
              />
              {errors.teacher_name && (
                <p className="text-xs text-destructive">{errors.teacher_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="monthly_fee">
                Oylik to‘lov (so‘m) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="monthly_fee"
                type="number"
                placeholder="400000"
                disabled={loading}
                {...register("monthly_fee")}
              />
              {errors.monthly_fee && (
                <p className="text-xs text-destructive">{errors.monthly_fee.message}</p>
              )}
            </div>
          </div>

          {/* Room, Start Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="room">Xona</Label>
              <Input
                id="room"
                placeholder="Xona 102"
                disabled={loading}
                {...register("room")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start_date">Boshlanish sanasi</Label>
              <Input
                id="start_date"
                type="date"
                disabled={loading}
                {...register("start_date")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Holati</Label>
              <Select
                value={selectedStatus || "Faol"}
                onValueChange={(val: any) => setValue("status", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Holatni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Faol">Faol</SelectItem>
                  <SelectItem value="Rejalashtirilgan">Rejalashtirilgan</SelectItem>
                  <SelectItem value="Yopilgan">Yopilgan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule Builder */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-sm">Dars jadvali (Kunlar va vaqtlar)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() =>
                  append({ day: "Dushanba", start_time: "14:00", end_time: "16:00" })
                }
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kun qo‘shish</span>
              </Button>
            </div>

            {errors.schedule && (
              <p className="text-xs text-destructive">{errors.schedule.message}</p>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/70 text-xs"
                >
                  <div className="flex-1">
                    <select
                      {...register(`schedule.${index}.day` as const)}
                      aria-label="Dars kuni"
                      className="w-full h-8 px-2 rounded-md border border-input bg-background font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {WEEKDAYS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <Input
                      type="time"
                      className="h-8 text-xs"
                      aria-label="Boshlanish vaqti"
                      {...register(`schedule.${index}.start_time` as const)}
                    />
                  </div>

                  <span className="text-muted-foreground">-</span>

                  <div className="w-28">
                    <Input
                      type="time"
                      className="h-8 text-xs"
                      aria-label="Tugash vaqti"
                      {...register(`schedule.${index}.end_time` as const)}
                    />
                  </div>

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
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
              {loading ? "Saqlanmoqda..." : isEditing ? "O‘zgarishlarni saqlash" : "Guruhni ochish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
