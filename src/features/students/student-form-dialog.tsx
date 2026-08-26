"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentSchema, StudentFormValues } from "./student-schema";
import { Student, Group } from "@/types/database";
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
import { User, Phone, MapPin, Calendar, Users, FileText } from "lucide-react";

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  groups: Group[];
  initialGroupId?: string;
  onSave: (values: StudentFormValues, id?: string) => Promise<void> | void;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
  groups,
  initialGroupId,
  onSave,
}: StudentFormDialogProps) {
  const isEditing = !!student;
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      parent_name: "",
      parent_phone: "",
      birth_date: "",
      gender: "Erkak",
      address: "",
      status: "Faol",
      group_id: initialGroupId || "",
      notes: "",
    },
  });

  const selectedGender = watch("gender");
  const selectedStatus = watch("status");
  const selectedGroup = watch("group_id");

  React.useEffect(() => {
    if (student) {
      reset({
        first_name: student.first_name || "",
        last_name: student.last_name || "",
        phone: student.phone || "",
        parent_name: student.parent_name || "",
        parent_phone: student.parent_phone || "",
        birth_date: student.birth_date || "",
        gender: student.gender || "Erkak",
        address: student.address || "",
        status: student.status || "Faol",
        group_id: initialGroupId || "",
        notes: student.notes || "",
      });
    } else {
      reset({
        first_name: "",
        last_name: "",
        phone: "",
        parent_name: "",
        parent_phone: "",
        birth_date: "",
        gender: "Erkak",
        address: "",
        status: "Faol",
        group_id: initialGroupId || "",
        notes: "",
      });
    }
  }, [student, initialGroupId, reset, open]);

  const onSubmit = async (values: StudentFormValues) => {
    setLoading(true);
    try {
      await onSave(values, student?.id);
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
            {isEditing ? "O‘quvchi ma'lumotlarini tahrirlash" : "Yangi o‘quvchi qo‘shish"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            O‘quvchining shaxsiy, aloqa va guruhga biriktirish ma'lumotlarini to‘ldiring
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">
                Ismi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="first_name"
                placeholder="Masalan: Temur"
                disabled={loading}
                {...register("first_name")}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last_name">Familiyasi</Label>
              <Input
                id="last_name"
                placeholder="Masalan: Aliyev"
                disabled={loading}
                {...register("last_name")}
              />
            </div>
          </div>

          {/* Phone & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">O‘quvchi telefoni</Label>
              <Input
                id="phone"
                placeholder="+998 90 123 45 67"
                disabled={loading}
                {...register("phone")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Jinsi</Label>
              <Select
                value={selectedGender || "Erkak"}
                onValueChange={(val: "Erkak" | "Ayol") => setValue("gender", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Jinsni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Erkak">Erkak</SelectItem>
                  <SelectItem value="Ayol">Ayol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Parent Name & Parent Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="parent_name">Ota-onasi yoki vasiy ismi</Label>
              <Input
                id="parent_name"
                placeholder="Masalan: Rustam Aliyev"
                disabled={loading}
                {...register("parent_name")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="parent_phone">Ota-onasining telefoni</Label>
              <Input
                id="parent_phone"
                placeholder="+998 90 111 00 11"
                disabled={loading}
                {...register("parent_phone")}
              />
            </div>
          </div>

          {/* Group & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Guruhga biriktirish</Label>
              <Select
                value={selectedGroup || "none"}
                onValueChange={(val) => setValue("group_id", val === "none" ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Guruhni tanlang (ixtiyoriy)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Guruhsiz (Keyinroq biriktirish)</SelectItem>
                  {groups.map((grp) => (
                    <SelectItem key={grp.id} value={grp.id}>
                      {grp.name} ({grp.course_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>O‘quvchi holati</Label>
              <Select
                value={selectedStatus || "Faol"}
                onValueChange={(val: any) => setValue("status", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Holatni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Faol">Faol</SelectItem>
                  <SelectItem value="Ta’til">Ta’til</SelectItem>
                  <SelectItem value="Bitirgan">Bitirgan</SelectItem>
                  <SelectItem value="Tark etgan">Tark etgan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Birth Date & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="birth_date">Tug‘ilgan sana</Label>
              <Input
                id="birth_date"
                type="date"
                disabled={loading}
                {...register("birth_date")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Yashash manzili</Label>
              <Input
                id="address"
                placeholder="Shahar, tuman, ko‘cha"
                disabled={loading}
                {...register("address")}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Qo‘shimcha izoh</Label>
            <Input
              id="notes"
              placeholder="O‘quvchi haqida qo‘shimcha eslatmalar..."
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
              {loading ? "Saqlanmoqda..." : isEditing ? "O‘zgarishlarni saqlash" : "O‘quvchini saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
