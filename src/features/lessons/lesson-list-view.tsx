"use client";

import * as React from "react";
import Link from "next/link";
import { Lesson, Group } from "@/types/database";
import { crmStore } from "@/services/crm-store";
import { LessonFormDialog } from "./lesson-form-dialog";
import { LessonFormValues } from "./lesson-schema";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  Clock,
  CalendarCheck2,
  MoreVertical,
  Edit,
  Trash2,
  FileCheck2,
  CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

export function LessonListView() {
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingLesson, setEditingLesson] = React.useState<Lesson | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [lessonToDelete, setLessonToDelete] = React.useState<Lesson | null>(null);

  const loadData = React.useCallback(() => {
    setLessons(crmStore.getLessons());
    setGroups(crmStore.getGroups());
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLessons = React.useMemo(() => {
    return lessons.filter((ls) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ls.topic.toLowerCase().includes(q) ||
        (ls.description && ls.description.toLowerCase().includes(q)) ||
        (ls.homework && ls.homework.toLowerCase().includes(q));

      const matchesGroup = groupFilter === "all" || ls.group_id === groupFilter;
      const matchesStatus = statusFilter === "all" || ls.status === statusFilter;

      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [lessons, searchQuery, groupFilter, statusFilter]);

  const handleSaveLesson = async (values: LessonFormValues, id?: string) => {
    try {
      crmStore.saveLesson({
        id,
        group_id: values.group_id,
        date: values.date,
        start_time: values.start_time,
        end_time: values.end_time,
        topic: values.topic,
        description: values.description || null,
        homework: values.homework || null,
        status: values.status,
      });

      toast.success(id ? "Dars ma'lumotlari yangilandi" : "Yangi dars rejalashtirildi");
      loadData();
    } catch {
      toast.error("Darsni saqlashda xatolik yuz berdi");
    }
  };

  const handleDeleteLesson = () => {
    if (!lessonToDelete) return;
    try {
      crmStore.deleteLesson(lessonToDelete.id);
      toast.success("Dars tizimdan o‘chirildi");
      setDeleteConfirmOpen(false);
      setLessonToDelete(null);
      loadData();
    } catch {
      toast.error("O‘chirishda xatolik yuz berdi");
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar: Search, Filters & Add Button */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Dars mavzusi, reja yoki vazifa bo‘yicha qidirish..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex gap-2">
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Dars holati bo‘yicha filtrlash"
              className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Barcha holatlar</option>
              <option value="Rejalashtirilgan">Rejalashtirilgan</option>
              <option value="O‘tkazildi">O‘tkazildi</option>
              <option value="Bekor qilindi">Bekor qilindi</option>
            </select>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingLesson(null);
            setFormDialogOpen(true);
          }}
          className="gap-2 shrink-0"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi dars qo‘shish</span>
        </Button>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground px-1">
        Jami: <strong className="text-foreground">{filteredLessons.length}</strong> ta dars qayd etilgan
      </div>

      {/* Lessons List */}
      {filteredLessons.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Darslar topilmadi"
          description={
            searchQuery || groupFilter !== "all" || statusFilter !== "all"
              ? "Qidiruv so‘rovi yoki filtr bo‘yicha dars topilmadi."
              : "Hozircha darslar jurnali bo‘sh. Birinchi darsni rejalashtiring."
          }
          actionLabel={searchQuery ? "Qidiruvni tozalash" : "Yangi dars qo‘shish"}
          onAction={() => {
            if (searchQuery || groupFilter !== "all" || statusFilter !== "all") {
              setSearchQuery("");
              setGroupFilter("all");
              setStatusFilter("all");
            } else {
              setEditingLesson(null);
              setFormDialogOpen(true);
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredLessons.map((ls) => {
            const group = groups.find((g) => g.id === ls.group_id);
            const attendanceRecords = crmStore.getAttendance(ls.id);
            const presentCount = attendanceRecords.filter((a) => a.status === "Keldi").length;
            const totalStudents = crmStore.getStudentsByGroupId(ls.group_id).length;

            return (
              <Card
                key={ls.id}
                className="shadow-sm hover:shadow-md transition-all border-border/80"
              >
                <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {group?.name || "Noma'lum guruh"}
                      </span>
                      <StatusBadge status={ls.status} />
                      {attendanceRecords.length > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Davomat: {presentCount} / {totalStudents} keldi
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-foreground leading-snug">
                      {ls.topic}
                    </h3>

                    {ls.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {ls.description}
                      </p>
                    )}

                    {ls.homework && (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Vazifa: {ls.homework}</span>
                      </div>
                    )}
                  </div>

                  {/* Right side: Date, Time & Actions */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                    <div className="text-left md:text-right space-y-0.5 text-xs">
                      <div className="font-bold text-foreground flex items-center md:justify-end gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{formatDate(ls.date, "EEEE, d-MMMM, yyyy")}</span>
                      </div>
                      <div className="text-muted-foreground font-mono flex items-center md:justify-end gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{ls.start_time} - {ls.end_time}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                        <Link href={`/attendance?groupId=${ls.group_id}&lessonId=${ls.id}`}>
                          <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Davomat</span>
                        </Link>
                      </Button>

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
                              setEditingLesson(ls);
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
                              setLessonToDelete(ls);
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Lesson Dialog */}
      <LessonFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        lesson={editingLesson}
        groups={groups}
        onSave={handleSaveLesson}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Darsni o‘chirishni tasdiqlaysizmi?"
        description={`"${lessonToDelete?.topic}" mavzusidagi dars va uning barcha davomat yozuvlari o‘chiriladi.`}
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        onConfirm={handleDeleteLesson}
      />
    </div>
  );
}
