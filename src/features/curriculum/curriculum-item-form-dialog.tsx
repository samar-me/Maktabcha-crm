"use client";

import * as React from "react";
import {
  CurriculumItem,
  CurriculumItemFormData,
  CurriculumItemStatus,
} from "@/types/curriculum";
import {
  createCurriculumItemAction,
  updateCurriculumItemAction,
  enrichCurriculumTopicWithAIAction,
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
import { BookOpen, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CurriculumItemFormDialogProps {
  curriculumId: string;
  courseContext?: string;
  initialData?: CurriculumItem | null;
  defaultOrderNumber?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CurriculumItemFormDialog({
  curriculumId,
  courseContext,
  initialData,
  defaultOrderNumber = 1,
  open,
  onOpenChange,
  onSuccess,
}: CurriculumItemFormDialogProps) {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = React.useState(initialData?.title || "");
  const [orderNumber, setOrderNumber] = React.useState<number>(
    initialData?.order_number || defaultOrderNumber
  );
  const [category, setCategory] = React.useState(initialData?.category || "");
  const [durationMinutes, setDurationMinutes] = React.useState<number>(
    initialData?.duration_minutes || 90
  );
  const [objective, setObjective] = React.useState(initialData?.objective || "");
  const [description, setDescription] = React.useState(initialData?.description || "");
  const [practice, setPractice] = React.useState(initialData?.practice || "");
  const [homeworkPlan, setHomeworkPlan] = React.useState(
    initialData?.homework_plan || ""
  );
  const [plannedDate, setPlannedDate] = React.useState(
    initialData?.planned_date || ""
  );
  const [status, setStatus] = React.useState<CurriculumItemStatus>(
    initialData?.status || "Rejalashtirilgan"
  );

  const [loading, setLoading] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);

  React.useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setOrderNumber(initialData.order_number);
      setCategory(initialData.category || "");
      setDurationMinutes(initialData.duration_minutes || 90);
      setObjective(initialData.objective || "");
      setDescription(initialData.description || "");
      setPractice(initialData.practice || "");
      setHomeworkPlan(initialData.homework_plan || "");
      setPlannedDate(initialData.planned_date || "");
      setStatus(initialData.status || "Rejalashtirilgan");
    } else {
      setTitle("");
      setOrderNumber(defaultOrderNumber);
      setCategory("");
      setDurationMinutes(90);
      setObjective("");
      setDescription("");
      setPractice("");
      setHomeworkPlan("");
      setPlannedDate("");
      setStatus("Rejalashtirilgan");
    }
  }, [initialData, defaultOrderNumber]);

  // AI Topic Enrichment helper
  const handleAIEnrich = async () => {
    if (!title.trim()) {
      toast.error("Avval mavzu nomini kiriting");
      return;
    }

    setAiLoading(true);
    try {
      const res = await enrichCurriculumTopicWithAIAction(title.trim(), courseContext);
      if (res.success && res.data) {
        if (res.data.objective) setObjective(res.data.objective);
        if (res.data.description) setDescription(res.data.description);
        if (res.data.practice) setPractice(res.data.practice);
        if (res.data.homeworkPlan) setHomeworkPlan(res.data.homeworkPlan);
        toast.success("✨ AI mavzu detallarini to‘ldirdi!");
      } else {
        toast.error(res.error || "AI tahlil qilishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Iltimos, mavzu nomini kiriting");
      return;
    }

    setLoading(true);
    const payload: CurriculumItemFormData = {
      title: title.trim(),
      order_number: Number(orderNumber) || 1,
      category: category.trim() || null,
      duration_minutes: Number(durationMinutes) || 90,
      objective: objective.trim() || null,
      description: description.trim() || null,
      practice: practice.trim() || null,
      homework_plan: homeworkPlan.trim() || null,
      planned_date: plannedDate || null,
      status,
    };

    try {
      if (isEditing && initialData) {
        const res = await updateCurriculumItemAction(initialData.id, curriculumId, payload);
        if (res.success) {
          toast.success("Mavzu yangilandi");
          onOpenChange(false);
          onSuccess();
        } else {
          toast.error(res.error || "Yangilashda xatolik");
        }
      } else {
        const res = await createCurriculumItemAction(curriculumId, payload);
        if (res.success) {
          toast.success("Yangi mavzu qo‘shildi");
          onOpenChange(false);
          onSuccess();
        } else {
          toast.error(res.error || "Qo‘shishda xatolik");
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>{isEditing ? `${orderNumber}-darsni tahrirlash` : "Yangi mavzu qo‘shish"}</span>
              </DialogTitle>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAIEnrich}
                disabled={aiLoading || !title.trim()}
                className="text-xs h-8 gap-1.5 border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              >
                {aiLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                )}
                <span>AI bilan boyitish</span>
              </Button>
            </div>
            <DialogDescription className="text-xs">
              Mavzu maqsadi, amaliy mashg‘ulot va uy vazifasi tafsilotlari
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3.5 py-2 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs font-semibold">
                  № Dars <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(Number(e.target.value))}
                  className="h-9 text-xs font-bold text-center"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <Label className="text-xs font-semibold">
                  Mavzu nomi <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="Masalan: Telegram Desktop o‘rnatish va sozlash"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs font-semibold"
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Bo‘lim / Kategoriya</Label>
                <Input
                  placeholder="Kirish / Amaliy"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Davomiyligi (minut)</Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Holat</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium"
                >
                  <option value="Rejalashtirilgan">Rejalashtirilgan</option>
                  <option value="O‘tilgan">O‘tilgan</option>
                  <option value="O‘tkazib yuborilgan">O‘tkazib yuborilgan</option>
                  <option value="Ko‘chirilgan">Ko‘chirilgan</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Darsning asosiy maqsadi</Label>
              <Input
                placeholder="O‘quvchi ushbu darsda nimalarni mustaqil bajara oladi..."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Dars tavsifi va nazariyasi</Label>
              <Textarea
                placeholder="Mavzuning asosiy tushunchalari va kalit so‘zlari..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Amaliy mashg‘ulot (Dars davomida)</Label>
              <Textarea
                placeholder="1. Dasturni yuklab olish. 2. O‘rnatish va sozlash..."
                value={practice}
                onChange={(e) => setPractice(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Uy vazifasi rejasi</Label>
              <Textarea
                placeholder="O‘quvchilar mustaqil bajaradigan topshiriq..."
                value={homeworkPlan}
                onChange={(e) => setHomeworkPlan(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border mt-2">
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
