"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Group } from "@/types/database";
import {
  Curriculum,
  CurriculumItem,
  CurriculumProgress,
} from "@/types/curriculum";
import {
  getCurriculumItemsAction,
  deleteCurriculumItemAction,
  reorderCurriculumItemsAction,
  createLessonFromCurriculumItemAction,
  duplicateCurriculumAction,
} from "@/actions/curriculum";
import { CurriculumItemFormDialog } from "./curriculum-item-form-dialog";
import { CurriculumImportDialog } from "./curriculum-import-dialog";
import { CurriculumFormDialog } from "./curriculum-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Plus,
  Search,
  Upload,
  Sparkles,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  MoveUp,
  MoveDown,
  Calendar,
  Layers,
  GraduationCap,
  Copy,
  ExternalLink,
  Loader2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface CurriculumDetailViewProps {
  curriculum: Curriculum;
  initialItems: CurriculumItem[];
  initialProgress: CurriculumProgress;
  groups: Group[];
}

export function CurriculumDetailView({
  curriculum,
  initialItems,
  initialProgress,
  groups,
}: CurriculumDetailViewProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<CurriculumItem[]>(initialItems);
  const [progress, setProgress] = React.useState<CurriculumProgress>(initialProgress);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Dialogs
  const [itemFormOpen, setItemFormOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<CurriculumItem | null>(null);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [editCurriculumOpen, setEditCurriculumOpen] = React.useState(false);

  // Delete Item Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [targetDeleteId, setTargetDeleteId] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Create Lesson Modal
  const [lessonModalOpen, setLessonModalOpen] = React.useState(false);
  const [selectedTopicForLesson, setSelectedTopicForLesson] = React.useState<CurriculumItem | null>(null);
  const [lessonGroupId, setLessonGroupId] = React.useState<string>(curriculum.group_id || groups[0]?.id || "");
  const [lessonDate, setLessonDate] = React.useState<string>(new Date().toISOString().split("T")[0]);
  const [lessonStartTime, setLessonStartTime] = React.useState("09:00");
  const [lessonEndTime, setLessonEndTime] = React.useState("10:30");
  const [creatingLesson, setCreatingLesson] = React.useState(false);

  // Refresh Items
  const refreshItems = async () => {
    const res = await getCurriculumItemsAction(curriculum.id);
    if (res.success && res.data) {
      setItems(res.data);
      const total = res.data.length;
      const completed = res.data.filter((i) => i.status === "O‘tilgan").length;
      const skipped = res.data.filter((i) => i.status === "O‘tkazib yuborilgan").length;
      setProgress({
        totalItems: total,
        completedItems: completed,
        remainingItems: total - completed - skipped,
        skippedItems: skipped,
        progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    }
  };

  // Filtered items
  const filtered = React.useMemo(() => {
    return items.filter((it) => {
      if (statusFilter === "completed" && it.status !== "O‘tilgan") return false;
      if (statusFilter === "remaining" && it.status === "O‘tilgan") return false;
      if (statusFilter === "no_assignment" && (it.assignments_count || 0) > 0) return false;
      if (statusFilter === "planned" && it.status !== "Rejalashtirilgan") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = it.title.toLowerCase().includes(q);
        const matchCat = it.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchCat) return false;
      }
      return true;
    });
  }, [items, statusFilter, search]);

  // Handle Move Up / Down
  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    setItems(newItems);

    try {
      const ids = newItems.map((i) => i.id);
      await reorderCurriculumItemsAction(curriculum.id, ids);
      toast.success("Tartib yangilandi");
    } catch {
      toast.error("Tartibni saqlashda xatolik");
      await refreshItems();
    }
  };

  // Handle Delete Topic
  const handleDeleteItem = async () => {
    if (!targetDeleteId) return;
    setDeleteLoading(true);
    try {
      const res = await deleteCurriculumItemAction(targetDeleteId, curriculum.id);
      if (res.success) {
        toast.success("Mavzu o‘chirildi");
        setDeleteDialogOpen(false);
        await refreshItems();
      } else {
        toast.error(res.error || "O‘chirishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Create Lesson Submission
  const handleCreateLesson = async () => {
    if (!selectedTopicForLesson || !lessonGroupId) return;
    setCreatingLesson(true);

    try {
      const res = await createLessonFromCurriculumItemAction(
        selectedTopicForLesson.id,
        lessonGroupId,
        lessonDate,
        lessonStartTime,
        lessonEndTime
      );

      if (res.success && res.lessonId) {
        toast.success("✨ Dars yaratildi va o‘quv rejada 'O‘tilgan' deb belgilandi!");
        setLessonModalOpen(false);
        await refreshItems();
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
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 self-start h-9 text-xs">
          <Link href="/curriculum">
            <ArrowLeft className="w-4 h-4" />
            <span>Barcha ish rejalarga qaytish</span>
          </Link>
        </Button>

        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                    {curriculum.course_name}
                  </span>
                  {curriculum.groups ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Guruh: {curriculum.groups.name}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                      Umumiy dastur
                    </span>
                  )}
                  {curriculum.academic_period && (
                    <span className="text-xs text-muted-foreground">
                      • {curriculum.academic_period}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {curriculum.name}
                </h1>
                {curriculum.description && (
                  <p className="text-xs text-muted-foreground">
                    {curriculum.description}
                  </p>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setImportDialogOpen(true)}
                  className="gap-1.5 h-9 text-xs font-semibold border-border hover:bg-muted/60"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>📥 Fayldan yuklash</span>
                  <span className="hidden lg:inline text-[10px] text-muted-foreground font-normal">
                    (Excel, Word, PDF, CSV, TXT)
                  </span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingItem(null);
                    setItemFormOpen(true);
                  }}
                  className="gap-1.5 h-9 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Mavzu qo‘shish</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Progress Bar Summary */}
          <CardContent className="pt-0 border-t border-border/60 mt-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 text-xs">
              <div>
                <span className="text-muted-foreground">Jami mavzular:</span>
                <p className="font-bold text-base text-foreground mt-0.5">
                  {progress.totalItems} ta
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">O‘tilgan darslar:</span>
                <p className="font-bold text-base text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {progress.completedItems} ta
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Qolgan mavzular:</span>
                <p className="font-bold text-base text-blue-600 dark:text-blue-400 mt-0.5">
                  {progress.remainingItems} ta
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Progress:</span>
                <p className="font-bold text-base text-foreground mt-0.5">
                  {progress.progressPercentage}%
                </p>
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${progress.progressPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Mavzular bo‘yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border gap-1 overflow-x-auto">
          {[
            { key: "all", label: "Barchasi" },
            { key: "completed", label: "O‘tilgan" },
            { key: "remaining", label: "Qolgan" },
            { key: "no_assignment", label: "Topshiriqsiz" },
            { key: "planned", label: "Reja" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f.key
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Topics List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Mavzular topilmadi"
          description={
            search
              ? "Qidiruv bo‘yicha mavzular topilmadi"
              : "Ushbu ish rejasiga hali hech qanday mavzu qo‘shilmagan"
          }
          actionLabel="Mavzu qo‘shish"
          onAction={() => {
            setEditingItem(null);
            setItemFormOpen(true);
          }}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item, index) => {
            const isCompleted = item.status === "O‘tilgan";

            return (
              <Card
                key={item.id}
                className={`transition-all shadow-xs border ${
                  isCompleted
                    ? "border-emerald-200/60 dark:border-emerald-950/40 bg-emerald-50/10 dark:bg-emerald-950/5"
                    : "border-border bg-card"
                }`}
              >
                <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {/* Left: Number, Title & Badges */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                        isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {item.order_number}
                    </span>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.category && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {item.category}
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                              : item.status === "Ko‘chirilgan"
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                              : "bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                          }`}
                        >
                          {item.status}
                        </span>

                        {item.linked_lesson && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Dars o‘tildi ({item.linked_lesson.date})</span>
                          </span>
                        )}

                        {(item.assignments_count || 0) > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>{item.assignments_count} ta test yaratilgan</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                        <Link
                          href={`/curriculum/${curriculum.id}/items/${item.id}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {item.title}
                        </Link>
                      </h3>

                      {item.objective && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          🎯 {item.objective}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 flex-wrap">
                    {/* View Details */}
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <Link href={`/curriculum/${curriculum.id}/items/${item.id}`}>
                        <span>Batafsil</span>
                      </Link>
                    </Button>

                    {/* Create Lesson if not completed yet */}
                    {!isCompleted ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTopicForLesson(item);
                          setLessonModalOpen(true);
                        }}
                        className="h-8 text-xs gap-1 border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>Dars yaratish</span>
                      </Button>
                    ) : item.linked_lesson ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 border-emerald-200 text-emerald-700 dark:text-emerald-300"
                      >
                        <Link href={`/lessons/${item.linked_lesson.id}`}>
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Darsga o‘tish</span>
                        </Link>
                      </Button>
                    ) : null}

                    {/* AI Assignment Generation Shortcut */}
                    <Button
                      asChild
                      size="sm"
                      className="h-8 text-xs gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs"
                    >
                      <Link href={`/assignments/new?mode=ai&curriculumItemId=${item.id}&groupId=${curriculum.group_id || ""}`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI test</span>
                      </Link>
                    </Button>

                    {/* Move Up / Down */}
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        className="h-7 w-7 text-muted-foreground"
                        title="Yuqoriga surish"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === items.length - 1}
                        className="h-7 w-7 text-muted-foreground"
                        title="Pastga surish"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Edit */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingItem(item);
                        setItemFormOpen(true);
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>

                    {/* Delete */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setTargetDeleteId(item.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Topic Dialog */}
      <CurriculumItemFormDialog
        curriculumId={curriculum.id}
        courseContext={curriculum.course_name}
        initialData={editingItem}
        defaultOrderNumber={items.length + 1}
        open={itemFormOpen}
        onOpenChange={setItemFormOpen}
        onSuccess={refreshItems}
      />

      {/* Excel / Text Import Dialog */}
      <CurriculumImportDialog
        curriculumId={curriculum.id}
        curriculumName={curriculum.name}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={refreshItems}
      />

      {/* Edit Curriculum Settings Dialog */}
      <CurriculumFormDialog
        groups={groups}
        initialData={curriculum}
        open={editCurriculumOpen}
        onOpenChange={setEditCurriculumOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Create Lesson From Topic Dialog */}
      <Dialog open={lessonModalOpen} onOpenChange={setLessonModalOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              <span>Dars yaratish — {selectedTopicForLesson?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mavzu avtomatik tarzda yangi darsga biriktiriladi va o‘quv rejada "O‘tilgan" deb belgilanadi.
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Mavzuni o‘chirishni tasdiqlaysizmi?"
        description="Ushbu rejalashtirilgan mavzu o‘quv dasturidan o‘chiriladi va tartib raqamlari qayta hisoblanadi."
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDeleteItem}
      />
    </div>
  );
}
