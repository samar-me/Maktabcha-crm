"use client";

import * as React from "react";
import { Group } from "@/types/database";
import { Curriculum, CurriculumFormData } from "@/types/curriculum";
import {
  createCurriculumAction,
  updateCurriculumAction,
} from "@/actions/curriculum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CurriculumFormDialogProps {
  groups: Group[];
  initialData?: Curriculum | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (id?: string) => void;
}

export function CurriculumFormDialog({
  groups,
  initialData,
  open,
  onOpenChange,
  onSuccess,
}: CurriculumFormDialogProps) {
  const isEditing = Boolean(initialData);

  const [name, setName] = React.useState(initialData?.name || "");
  const [courseName, setCourseName] = React.useState(initialData?.course_name || "");
  const [groupId, setGroupId] = React.useState(initialData?.group_id || "");
  const [academicPeriod, setAcademicPeriod] = React.useState(
    initialData?.academic_period || ""
  );
  const [description, setDescription] = React.useState(initialData?.description || "");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCourseName(initialData.course_name);
      setGroupId(initialData.group_id || "");
      setAcademicPeriod(initialData.academic_period || "");
      setDescription(initialData.description || "");
    } else {
      setName("");
      setCourseName(groups[0]?.course_name || "");
      setGroupId(groups[0]?.id || "");
      setAcademicPeriod("2025-2026");
      setDescription("");
    }
  }, [initialData, groups]);

  // When group changes, auto-set courseName if empty
  const handleGroupChange = (gId: string) => {
    setGroupId(gId);
    const grp = groups.find((g) => g.id === gId);
    if (grp && !courseName) {
      setCourseName(grp.course_name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Iltimos, ish reja nomini kiriting");
      return;
    }
    if (!courseName.trim()) {
      toast.error("Iltimos, kurs/fan nomini kiriting");
      return;
    }

    setLoading(true);
    const payload: CurriculumFormData = {
      name: name.trim(),
      course_name: courseName.trim(),
      group_id: groupId || null,
      academic_period: academicPeriod.trim() || null,
      description: description.trim() || null,
      status: "Faol",
    };

    try {
      if (isEditing && initialData) {
        const res = await updateCurriculumAction(initialData.id, payload);
        if (res.success) {
          toast.success("Ish reja yangilandi");
          onOpenChange(false);
          onSuccess(initialData.id);
        } else {
          toast.error(res.error || "Yangilashda xatolik");
        }
      } else {
        const res = await createCurriculumAction(payload);
        if (res.success && res.id) {
          toast.success("Yangi ish reja yaratildi!");
          onOpenChange(false);
          onSuccess(res.id);
        } else {
          toast.error(res.error || "Yaratishda xatolik");
        }
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>{isEditing ? "Ish rejani tahrirlash" : "Yangi Ish reja / O‘quv dasturi"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mavzular rejasini yaratish va darslar hamda testlarga bog‘lash
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Ish reja nomi <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Masalan: Frontend Web Dasturlash — 6 oylik to‘liq reja"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-xs font-medium"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Kurs / Fan nomi <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="Frontend / JavaScript"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">O‘quv davri</Label>
                <Input
                  placeholder="2025-2026"
                  value={academicPeriod}
                  onChange={(e) => setAcademicPeriod(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Biriktirilgan guruh (ixtiyoriy)
              </Label>
              <select
                value={groupId}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium"
              >
                <option value="">Umumiy o‘quv dasturi (barcha guruhlar uchun)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.course_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tavsif (ixtiyoriy)</Label>
              <Textarea
                placeholder="Ushbu o‘quv dasturining maqsadi va qamrovi..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                "Saqlash"
              ) : (
                "Yaratish"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
