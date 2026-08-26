"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Group } from "@/types/database";
import { Curriculum, CurriculumItem } from "@/types/curriculum";
import {
  deleteCurriculumItemAction,
  createLessonFromCurriculumItemAction,
} from "@/actions/curriculum";
import { CurriculumItemFormDialog } from "./curriculum-item-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  BookOpen,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  ExternalLink,
  Target,
  FileText,
  Code,
  CheckSquare,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface CurriculumItemDetailViewProps {
  curriculum: Curriculum;
  item: CurriculumItem;
  groups: Group[];
}

export function CurriculumItemDetailView({
  curriculum,
  item: initialItem,
  groups,
}: CurriculumItemDetailViewProps) {
  const router = useRouter();
  const [item, setItem] = React.useState<CurriculumItem>(initialItem);

  // Edit Item Form
  const [editOpen, setEditOpen] = React.useState(false);

  // Delete Dialog
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Create Lesson Dialog
  const [lessonModalOpen, setLessonModalOpen] = React.useState(false);
  const [lessonGroupId, setLessonGroupId] = React.useState<string>(
    curriculum.group_id || groups[0]?.id || ""
  );
  const [lessonDate, setLessonDate] = React.useState<string>(
    item.planned_date || new Date().toISOString().split("T")[0]
  );
  const [lessonStartTime, setLessonStartTime] = React.useState("09:00");
  const [lessonEndTime, setLessonEndTime] = React.useState("10:30");
  const [creatingLesson, setCreatingLesson] = React.useState(false);

  const isCompleted = item.status === "O‘tilgan";

  // Handle Delete Topic
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await deleteCurriculumItemAction(item.id, curriculum.id);
      if (res.success) {
        toast.success("Mavzu o‘chirildi");
        router.push(`/curriculum/${curriculum.id}`);
      } else {
        toast.error(res.error || "O‘chirishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Create Lesson
  const handleCreateLesson = async () => {
    if (!lessonGroupId) return;
    setCreatingLesson(true);

    try {
      const res = await createLessonFromCurriculumItemAction(
        item.id,
        lessonGroupId,
        lessonDate,
        lessonStartTime,
        lessonEndTime
      );

      if (res.success && res.lessonId) {
        toast.success("Dars yaratildi va o‘quv rejada 'O‘tilgan' deb belgilandi!");
        setLessonModalOpen(false);
        router.push(`/lessons/${res.lessonId}`);
      } else {
        toast.error(res.error || "Dars yaratishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setCreatingLesson(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 self-start h-9 text-xs">
          <Link href={`/curriculum/${curriculum.id}`}>
            <ArrowLeft className="w-4 h-4" />
            <span>{curriculum.name} rejasiga qaytish</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Tahrirlash</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setDeleteOpen(true)}
            className="h-8 w-8 text-muted-foreground hover:text-rose-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Topic Header Card */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  № {item.order_number}
                </span>

                {item.category && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {item.category}
                  </span>
                )}

                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isCompleted
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                      : "bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                  }`}
                >
                  {item.status}
                </span>

                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.duration_minutes} daqiqa</span>
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {item.title}
              </h1>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {!isCompleted ? (
                <Button
                  type="button"
                  onClick={() => setLessonModalOpen(true)}
                  className="h-10 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Dars yaratish</span>
                </Button>
              ) : item.linked_lesson ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-10 text-xs font-semibold gap-1.5 border-emerald-300 text-emerald-700 dark:text-emerald-300"
                >
                  <Link href={`/lessons/${item.linked_lesson.id}`}>
                    <ExternalLink className="w-4 h-4" />
                    <span>Darsni ko‘rish</span>
                  </Link>
                </Button>
              ) : null}

              <Button
                asChild
                className="h-10 text-xs font-semibold gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs"
              >
                <Link href={`/assignments/new?mode=ai&curriculumItemId=${item.id}&groupId=${curriculum.group_id || ""}`}>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ AI test yaratish</span>
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Objective */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Target className="w-4 h-4" />
              <span>Darsning asosiy maqsadi</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-foreground leading-relaxed">
            {item.objective || (
              <span className="text-muted-foreground italic">Maqsad kiritilmagan</span>
            )}
          </CardContent>
        </Card>

        {/* 2. Description & Theory */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <FileText className="w-4 h-4" />
              <span>Dars tavsifi va nazariyasi</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-foreground leading-relaxed whitespace-pre-line">
            {item.description || (
              <span className="text-muted-foreground italic">Tavsif kiritilmagan</span>
            )}
          </CardContent>
        </Card>

        {/* 3. Practice */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Code className="w-4 h-4" />
              <span>Amaliy mashg‘ulot (Darsda)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-foreground leading-relaxed whitespace-pre-line">
            {item.practice || (
              <span className="text-muted-foreground italic">Amaliyot kiritilmagan</span>
            )}
          </CardContent>
        </Card>

        {/* 4. Homework Plan */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <CheckSquare className="w-4 h-4" />
              <span>Uy vazifasi rejasi</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-foreground leading-relaxed whitespace-pre-line">
            {item.homework_plan || (
              <span className="text-muted-foreground italic">Uy vazifasi rejasi kiritilmagan</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linked Lesson & Assignments Card */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>O‘tilgan darslar va Telegram topshiriqlari</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {item.linked_lesson ? (
            <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Dars o‘tildi: {item.linked_lesson.topic}</span>
                </div>
                <p className="text-muted-foreground">Sanasi: {item.linked_lesson.date}</p>
              </div>

              <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                <Link href={`/lessons/${item.linked_lesson.id}`}>Dars sahifasi</Link>
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
              Ushbu mavzu bo‘yicha hali dars o‘tkazilmagan.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <CurriculumItemFormDialog
        curriculumId={curriculum.id}
        courseContext={curriculum.course_name}
        initialData={item}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Mavzuni o‘chirishni tasdiqlaysizmi?"
        description="Ushbu mavzu o‘quv rejadan butunlay o‘chiriladi."
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />

      {/* Create Lesson Dialog */}
      <Dialog open={lessonModalOpen} onOpenChange={setLessonModalOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              <span>Dars yaratish — {item.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mavzu asosida dars shakllantiriladi va o‘quv rejada "O‘tilgan" deb belgilanadi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Guruhni tanlang</Label>
              <select
                value={lessonGroupId}
                onChange={(e) => setLessonGroupId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.course_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dars sanasi</Label>
              <Input
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Boshlanish vaqti</Label>
                <Input
                  type="time"
                  value={lessonStartTime}
                  onChange={(e) => setLessonStartTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tugash vaqti</Label>
                <Input
                  type="time"
                  value={lessonEndTime}
                  onChange={(e) => setLessonEndTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLessonModalOpen(false)}
              disabled={creatingLesson}
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              onClick={handleCreateLesson}
              disabled={creatingLesson || !lessonGroupId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {creatingLesson ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Darsni yaratish va ochish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
