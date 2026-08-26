"use client";

import * as React from "react";
import { Grade, Group, Student, Lesson } from "@/types/database";
import { getGrades, saveGrade, deleteGrade } from "@/services/grades";
import { getGroups } from "@/services/groups";
import { getStudents } from "@/services/students";
import { getLessons } from "@/services/lessons";
import { GradeFormDialog } from "./grade-form-dialog";
import { GradeFormValues } from "./grade-schema";
import { StatCard } from "@/components/shared/stat-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  Award,
  TrendingUp,
  CheckCircle2,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

export function GradeListView() {
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingGrade, setEditingGrade] = React.useState<Grade | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [gradeToDelete, setGradeToDelete] = React.useState<Grade | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [grdList, grpList, stList, lsList] = await Promise.all([
        getGrades(),
        getGroups(),
        getStudents(),
        getLessons(),
      ]);
      setGrades(grdList);
      setGroups(grpList);
      setStudents(stList);
      setLessons(lsList);
    } catch {
      toast.error("Baholarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredGrades = React.useMemo(() => {
    return grades.filter((gr) => {
      const student = students.find((s) => s.id === gr.student_id);
      const studentName = student ? `${student.first_name} ${student.last_name || ""}`.toLowerCase() : "";
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        gr.title.toLowerCase().includes(q) ||
        studentName.includes(q) ||
        (gr.notes && gr.notes.toLowerCase().includes(q));

      const matchesGroup = groupFilter === "all" || gr.group_id === groupFilter;

      return matchesSearch && matchesGroup;
    });
  }, [grades, students, searchQuery, groupFilter]);

  const handleSaveGrade = async (values: GradeFormValues, id?: string) => {
    try {
      await saveGrade({
        id,
        student_id: values.student_id,
        group_id: values.group_id,
        lesson_id: values.lesson_id || null,
        title: values.title,
        score: values.score,
        max_score: values.max_score || 100,
        date: values.date,
        notes: values.notes || null,
      });

      toast.success(id ? "Baho yangilandi" : "Yangi baho kiritildi");
      await loadData();
    } catch {
      toast.error("Bahoni saqlashda xatolik yuz berdi");
    }
  };

  const handleDeleteGrade = async () => {
    if (!gradeToDelete) return;
    try {
      await deleteGrade(gradeToDelete.id);
      toast.success("Baho tizimdan o‘chirildi");
      setDeleteConfirmOpen(false);
      setGradeToDelete(null);
      await loadData();
    } catch {
      toast.error("O‘chirishda xatolik");
    }
  };

  // Summary Metrics
  const totalGrades = filteredGrades.length;
  const avgScore =
    totalGrades > 0
      ? Math.round(
          filteredGrades.reduce((acc, g) => acc + (Number(g.score) / Number(g.max_score || 100)) * 100, 0) /
            totalGrades
        )
      : 0;

  const excellentCount = filteredGrades.filter(
    (g) => (Number(g.score) / Number(g.max_score || 100)) * 100 >= 86
  ).length;

  const goodCount = filteredGrades.filter((g) => {
    const p = (Number(g.score) / Number(g.max_score || 100)) * 100;
    return p >= 71 && p < 86;
  }).length;

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="O‘rtacha o‘zlashtirish"
          value={`${avgScore}%`}
          icon={TrendingUp}
          subtitle="Guruhlar bo‘yicha umumiy o‘rtacha"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <StatCard
          title="A'lo natijalar (86-100%)"
          value={`${excellentCount} ta`}
          icon={Award}
          subtitle="Yuqori ball to‘plaganlar"
          iconColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="Yaxshi natijalar (71-85%)"
          value={`${goodCount} ta`}
          icon={CheckCircle2}
          subtitle="Barqaror o‘zlashtirayotganlar"
          iconColorClass="text-indigo-600 dark:text-indigo-400"
          iconBgClass="bg-indigo-50 dark:bg-indigo-950/50"
        />
        <StatCard
          title="Jami qayd etilgan baholar"
          value={`${totalGrades} ta`}
          icon={Calendar}
          subtitle="Barcha sinov natijalari"
          iconColorClass="text-purple-600 dark:text-purple-400"
          iconBgClass="bg-purple-50 dark:bg-purple-950/50"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="O‘quvchi ismi yoki sinov nomi bo‘yicha qidirish..."
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
            setEditingGrade(null);
            setFormDialogOpen(true);
          }}
          className="gap-2 shrink-0"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi baho qo‘yish</span>
        </Button>
      </div>

      {/* Grades Table / Mobile Cards */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs">Baholar yuklanmoqda...</p>
        </div>
      ) : filteredGrades.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Baholar topilmadi"
          description={
            searchQuery || groupFilter !== "all"
              ? "Qidiruv so‘rovi bo‘yicha baholash natijasi topilmadi."
              : "Hozircha baholash jurnali bo‘sh. Birinchi bahoni kiriting."
          }
          actionLabel={searchQuery ? "Qidiruvni tozalash" : "Yangi baho qo‘yish"}
          onAction={() => {
            if (searchQuery || groupFilter !== "all") {
              setSearchQuery("");
              setGroupFilter("all");
            } else {
              setEditingGrade(null);
              setFormDialogOpen(true);
            }
          }}
        />
      ) : (
        <>
          {/* Mobile Grade Cards (md:hidden) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredGrades.map((gr) => {
              const student = students.find((s) => s.id === gr.student_id);
              const group = groups.find((g) => g.id === gr.group_id);
              const percent = Math.round((Number(gr.score) / Number(gr.max_score || 100)) * 100);

              const isHigh = percent >= 86;
              const isMedium = percent >= 71 && percent < 86;

              return (
                <Card key={gr.id} className="p-4 space-y-3 border border-border shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {student?.first_name[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-foreground text-sm block truncate">
                          {student?.first_name} {student?.last_name || ""}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          {group?.name || "Guruh"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isHigh
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : isMedium
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {percent}%
                      </span>
                      <span className="text-xs font-bold font-mono text-foreground">
                        {gr.score}/{gr.max_score || 100}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 pt-1 border-t border-border/60">
                    <p className="font-semibold text-foreground">{gr.title}</p>
                    {gr.notes && (
                      <p className="text-muted-foreground italic text-[11px]">{gr.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-2">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {formatDate(gr.date)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingGrade(gr);
                          setFormDialogOpen(true);
                        }}
                        className="h-8 text-xs gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Tahrirlash</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setGradeToDelete(gr);
                          setDeleteConfirmOpen(true);
                        }}
                        className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table (hidden md:block) */}
          <Card className="hidden md:block shadow-sm overflow-hidden border-border/80">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">O‘quvchi</th>
                    <th className="px-4 py-3.5 font-semibold">Guruh</th>
                    <th className="px-4 py-3.5 font-semibold">Sinov / Nazorat</th>
                    <th className="px-4 py-3.5 font-semibold">Ball (Natija)</th>
                    <th className="px-4 py-3.5 font-semibold">Foiz</th>
                    <th className="px-4 py-3.5 font-semibold">Sana</th>
                    <th className="px-4 py-3.5 font-semibold">Izoh</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredGrades.map((gr) => {
                    const student = students.find((s) => s.id === gr.student_id);
                    const group = groups.find((g) => g.id === gr.group_id);
                    const percent = Math.round((Number(gr.score) / Number(gr.max_score || 100)) * 100);

                    const isHigh = percent >= 86;
                    const isMedium = percent >= 71 && percent < 86;

                    return (
                      <tr key={gr.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                              {student?.first_name[0] || "?"}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground block">
                                {student?.first_name} {student?.last_name || ""}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {student?.phone || ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {group?.name || "Guruh"}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-medium text-foreground">
                          {gr.title}
                        </td>

                        <td className="px-4 py-3.5 font-bold font-mono text-foreground">
                          {gr.score} <span className="text-muted-foreground font-normal">/ {gr.max_score || 100}</span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${
                              isHigh
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : isMedium
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {percent}%
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                          {formatDate(gr.date)}
                        </td>

                        <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-xs truncate">
                          {gr.notes || "—"}
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Amallar</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingGrade(gr);
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
                                  setGradeToDelete(gr);
                                  setDeleteConfirmOpen(true);
                                }}
                                className="text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                <span>O‘chirish</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Form Dialog */}
      <GradeFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        grade={editingGrade}
        groups={groups}
        students={students}
        lessons={lessons}
        onSave={handleSaveGrade}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Bahoni o‘chirishni tasdiqlaysizmi?"
        description={`"${gradeToDelete?.title}" baholash yozuvi tizimdan o‘chiriladi.`}
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        onConfirm={handleDeleteGrade}
      />
    </div>
  );
}
