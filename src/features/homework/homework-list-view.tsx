"use client";

import * as React from "react";
import { Homework, Group, Lesson, Student } from "@/types/database";
import { crmStore } from "@/services/crm-store";
import { HomeworkFormDialog } from "./homework-form-dialog";
import { HomeworkGradingDialog } from "./homework-grading-dialog";
import { HomeworkFormValues } from "./homework-schema";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  FileCheck2,
  Calendar,
  Clock,
  CheckCircle2,
  MoreVertical,
  Edit,
  Trash2,
  CheckSquare,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

export function HomeworkListView() {
  const [homeworkList, setHomeworkList] = React.useState<Homework[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingHomework, setEditingHomework] = React.useState<Homework | null>(null);

  const [gradingDialogOpen, setGradingDialogOpen] = React.useState(false);
  const [selectedHomeworkForGrading, setSelectedHomeworkForGrading] = React.useState<Homework | null>(null);
  const [groupStudentsForGrading, setGroupStudentsForGrading] = React.useState<Student[]>([]);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [homeworkToDelete, setHomeworkToDelete] = React.useState<Homework | null>(null);

  const loadData = React.useCallback(() => {
    setHomeworkList(crmStore.getHomework());
    setGroups(crmStore.getGroups());
    setLessons(crmStore.getLessons());
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredHomework = React.useMemo(() => {
    return homeworkList.filter((hw) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        hw.title.toLowerCase().includes(q) ||
        (hw.description && hw.description.toLowerCase().includes(q));

      const matchesGroup = groupFilter === "all" || hw.group_id === groupFilter;

      return matchesSearch && matchesGroup;
    });
  }, [homeworkList, searchQuery, groupFilter]);

  const handleSaveHomework = async (values: HomeworkFormValues, id?: string) => {
    try {
      crmStore.saveHomework({
        id,
        group_id: values.group_id,
        lesson_id: values.lesson_id || null,
        title: values.title,
        description: values.description || null,
        assigned_date: values.assigned_date,
        due_date: values.due_date || null,
      });

      toast.success(id ? "Vazifa ma'lumotlari yangilandi" : "Yangi vazifa berildi");
      loadData();
    } catch {
      toast.error("Vazifani saqlashda xatolik");
    }
  };

  const handleDeleteHomework = () => {
    if (!homeworkToDelete) return;
    try {
      crmStore.deleteHomework(homeworkToDelete.id);
      toast.success("Vazifa o‘chirildi");
      setDeleteConfirmOpen(false);
      setHomeworkToDelete(null);
      loadData();
    } catch {
      toast.error("O‘chirishda xatolik");
    }
  };

  const handleOpenGrading = (hw: Homework) => {
    const students = crmStore.getStudentsByGroupId(hw.group_id);
    setSelectedHomeworkForGrading(hw);
    setGroupStudentsForGrading(students);
    setGradingDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Topshiriq nomi yoki tavsifi bo‘yicha qidirish..."
              className="pl-9 text-sm"
            />
          </div>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            aria-label="Guruh bo‘yicha filtrlash"
            className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Barcha guruhlar</option>
            {groups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={() => {
            setEditingHomework(null);
            setFormDialogOpen(true);
          }}
          className="gap-2 shrink-0"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi vazifa berish</span>
        </Button>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground px-1">
        Jami: <strong className="text-foreground">{filteredHomework.length}</strong> ta uy vazifasi
      </div>

      {/* List */}
      {filteredHomework.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="Vazifalar topilmadi"
          description={
            searchQuery || groupFilter !== "all"
              ? "Qidiruv so‘rovi bo‘yicha vazifa topilmadi."
              : "Hozircha berilgan uy vazifalari mavjud emas. Yangi vazifa bering."
          }
          actionLabel={searchQuery ? "Qidiruvni tozalash" : "Yangi vazifa berish"}
          onAction={() => {
            if (searchQuery || groupFilter !== "all") {
              setSearchQuery("");
              setGroupFilter("all");
            } else {
              setEditingHomework(null);
              setFormDialogOpen(true);
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHomework.map((hw) => {
            const group = groups.find((g) => g.id === hw.group_id);
            const submissions = crmStore.getHomeworkSubmissions(hw.id);
            const groupStudents = crmStore.getStudentsByGroupId(hw.group_id);
            const completedCount = submissions.filter((s) => s.status === "Bajarildi").length;
            const totalStudents = groupStudents.length;
            const percent =
              totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

            return (
              <Card
                key={hw.id}
                className="shadow-sm hover:shadow-md transition-all border-border/80 flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {group?.name || "Guruh"}
                        </span>
                        {hw.due_date && (
                          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Muddati: {formatDate(hw.due_date)}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-foreground leading-snug">
                        {hw.title}
                      </h3>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Amallar</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingHomework(hw);
                            setFormDialogOpen(true);
                          }}
                          className="cursor-pointer"
                        >
                          <Edit className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span>Tahrirlash</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setHomeworkToDelete(hw);
                            setDeleteConfirmOpen(true);
                          }}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          <span>O‘chirish</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {hw.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {hw.description}
                    </p>
                  )}

                  {/* Submission Progress bar */}
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Bajarilish ko‘rsatkichi:</span>
                      <span className="font-bold text-foreground">
                        {completedCount} / {totalStudents} topshirdi ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Action Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Berilgan: {formatDate(hw.assigned_date)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenGrading(hw)}
                      className="gap-1.5 text-xs bg-muted/40 hover:bg-muted"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tekshirish & Baholash</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <HomeworkFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        homework={editingHomework}
        groups={groups}
        lessons={lessons}
        onSave={handleSaveHomework}
      />

      {/* Grading Dialog */}
      <HomeworkGradingDialog
        open={gradingDialogOpen}
        onOpenChange={setGradingDialogOpen}
        homework={selectedHomeworkForGrading}
        students={groupStudentsForGrading}
        onSaved={loadData}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Vazifani o‘chirishni tasdiqlaysizmi?"
        description={`"${homeworkToDelete?.title}" vazifasi va barcha o‘quvchilar topshiriqlari o‘chiriladi.`}
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        onConfirm={handleDeleteHomework}
      />
    </div>
  );
}
