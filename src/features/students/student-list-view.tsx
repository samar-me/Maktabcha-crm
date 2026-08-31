"use client";

import * as React from "react";
import Link from "next/link";
import { Student, Group, GroupStudent } from "@/types/database";
import { getStudents, createStudent, updateStudent, deleteStudent } from "@/services/students";
import { getGroups, getGroupStudents, addStudentToGroup } from "@/services/groups";
import { StudentFormDialog } from "./student-form-dialog";
import { StudentFormValues } from "./student-schema";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { excelExport } from "@/lib/excel-export";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  UserX,
  Loader2,
  User,
  RotateCcw,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import { attachReferralByCodeAction } from "@/actions/referrals";

export function StudentListView() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [enrollments, setEnrollments] = React.useState<GroupStudent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [studentToDelete, setStudentToDelete] = React.useState<Student | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [stList, grList, enrList] = await Promise.all([
        getStudents(),
        getGroups(),
        getGroupStudents(),
      ]);
      setStudents(stList);
      setGroups(grList);
      setEnrollments(enrList);
    } catch {
      setError("O‘quvchilar ro‘yxatini yuklashda xatolik yuz berdi");
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(loadData);

  // Group Map for student groups
  const studentGroupsMap = React.useMemo(() => {
    const map = new Map<string, Group[]>();
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    for (const enr of enrollments) {
      if (enr.status !== "Faol") continue;
      const g = groupMap.get(enr.group_id);
      if (!g) continue;

      const current = map.get(enr.student_id) || [];
      current.push(g);
      map.set(enr.student_id, current);
    }
    return map;
  }, [enrollments, groups]);

  // Filtered students computation
  const filteredStudents = React.useMemo(() => {
    return students.filter((student) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        student.first_name.toLowerCase().includes(q) ||
        (student.last_name && student.last_name.toLowerCase().includes(q)) ||
        (student.phone && student.phone.toLowerCase().includes(q)) ||
        (student.parent_name && student.parent_name.toLowerCase().includes(q)) ||
        (student.parent_phone && student.parent_phone.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "all" || student.status === statusFilter;

      let matchesGroup = true;
      if (groupFilter !== "all") {
        const studentGroups = studentGroupsMap.get(student.id) || [];
        matchesGroup = studentGroups.some((g) => g.id === groupFilter);
      }

      return matchesSearch && matchesStatus && matchesGroup;
    });
  }, [students, searchQuery, statusFilter, groupFilter, studentGroupsMap]);

  const handleSaveStudent = async (values: StudentFormValues, id?: string) => {
    try {
      if (id) {
        await updateStudent(id, {
          first_name: values.first_name,
          last_name: values.last_name || null,
          phone: values.phone || null,
          parent_name: values.parent_name || null,
          parent_phone: values.parent_phone || null,
          birth_date: values.birth_date || null,
          gender: values.gender || "Erkak",
          address: values.address || null,
          status: values.status,
          notes: values.notes || null,
        });
        toast.success("O‘quvchi ma'lumotlari yangilandi");
      } else {
        const created = await createStudent({
          first_name: values.first_name,
          last_name: values.last_name || null,
          phone: values.phone || null,
          parent_name: values.parent_name || null,
          parent_phone: values.parent_phone || null,
          birth_date: values.birth_date || null,
          gender: values.gender || "Erkak",
          address: values.address || null,
          status: values.status,
          notes: values.notes || null,
        });

        if (values.group_id) {
          await addStudentToGroup(values.group_id, created.id);
        }
        if (values.referral_code_input?.trim()) {
          const referral = await attachReferralByCodeAction(created.id, values.referral_code_input);
          if (!referral.success) throw new Error(referral.error);
        }
        toast.success("Yangi o‘quvchi muvaffaqiyatli qo‘shildi");
      }

      await loadData();
    } catch {
      toast.error("O‘quvchini saqlashda xatolik yuz berdi");
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await deleteStudent(studentToDelete.id);
      toast.success(`${studentToDelete.first_name} tizimdan o‘chirildi`);
      setDeleteConfirmOpen(false);
      setStudentToDelete(null);
      await loadData();
    } catch {
      toast.error("O‘chirishda xatolik yuz berdi");
    }
  };

  const handleStatusChange = async (student: Student, newStatus: Student["status"]) => {
    try {
      await updateStudent(student.id, { status: newStatus });
      toast.success(`Holat «${newStatus}»ga o‘zgartirildi`);
      await loadData();
    } catch {
      toast.error("Holatni o‘zgartirishda xatolik");
    }
  };

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      toast.error("Eksport qilish uchun o‘quvchilar mavjud emas");
      return;
    }
    excelExport.exportStudents(filteredStudents, groups);
    toast.success("O‘quvchilar ro‘yxati Excel (.xlsx) fayliga yuklandi!");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Controls Bar: Search, Filters & Action Buttons */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ism, telefon yoki ota-onasi bo‘yicha qidirish..."
              className="pl-9 text-base sm:text-sm h-11 sm:h-9"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Holat bo‘yicha filtrlash"
              className="h-10 sm:h-9 px-3 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring flex-1 sm:flex-initial"
            >
              <option value="all">Barcha holatlar</option>
              <option value="Faol">Faol</option>
              <option value="Ta’til">Ta’tilda</option>
              <option value="Bitirgan">Bitirgan</option>
              <option value="Tark etgan">Tark etgan</option>
            </select>

            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              aria-label="Guruh bo‘yicha filtrlash"
              className="h-10 sm:h-9 px-3 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring flex-1 sm:flex-initial"
            >
              <option value="all">Barcha guruhlar</option>
              {groups.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {grp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Jami: <strong className="text-foreground font-bold">{filteredStudents.length}</strong> nafar
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="gap-1.5 shrink-0 text-xs h-9"
              size="sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Excelga yuklash</span>
              <span className="sm:hidden">Excel</span>
            </Button>

            <Button
              onClick={() => {
                setEditingStudent(null);
                setFormDialogOpen(true);
              }}
              className="gap-1.5 shrink-0 text-xs h-9 font-semibold"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi o‘quvchi</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <span className="text-xs font-medium">{error}</span>
          <Button variant="outline" size="sm" onClick={loadData} className="text-xs h-8 gap-1">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Qayta urinish</span>
          </Button>
        </div>
      )}

      {/* Main Student List / Table */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs font-medium">O‘quvchilar ro‘yxati yuklanmoqda...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="O‘quvchilar topilmadi"
          description={
            searchQuery || statusFilter !== "all" || groupFilter !== "all"
              ? "Qidiruv so‘rovi yoki filtr bo‘yicha hech qanday o‘quvchi topilmadi."
              : "Hozircha tizimda o‘quvchilar mavjud emas. Yangi o‘quvchi qo‘shing."
          }
          actionLabel={searchQuery ? "Qidiruvni tozalash" : "Yangi o‘quvchi qo‘shish"}
          onAction={() => {
            if (searchQuery || statusFilter !== "all" || groupFilter !== "all") {
              setSearchQuery("");
              setStatusFilter("all");
              setGroupFilter("all");
            } else {
              setEditingStudent(null);
              setFormDialogOpen(true);
            }
          }}
        />
      ) : (
        <>
          {/* Mobile Card List (Visible on mobile screens < md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredStudents.map((st) => {
              const studentGroups = studentGroupsMap.get(st.id) || [];
              return (
                <Card key={st.id} className="p-4 space-y-3 border border-border shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/students/${st.id}`} className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">
                        {st.first_name[0]}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-foreground text-sm block truncate">
                          {st.first_name} {st.last_name || ""}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Qo‘shilgan: {formatDate(st.joined_at)}
                        </span>
                      </div>
                    </Link>
                    <StatusBadge status={st.status} />
                  </div>

                  {/* Groups */}
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[11px] text-muted-foreground mr-1">Guruh:</span>
                    {studentGroups.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Biriktirilmagan</span>
                    ) : (
                      studentGroups.map((grp) => (
                        <span
                          key={grp.id}
                          className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                        >
                          {grp.name}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Contacts */}
                  <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground pt-2 border-t border-border/60">
                    {st.phone && (
                      <a
                        href={`tel:${st.phone}`}
                        className="flex items-center gap-2 hover:text-blue-600 font-mono py-1 text-foreground"
                      >
                        <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{st.phone}</span>
                      </a>
                    )}
                    {st.parent_name && (
                      <div className="flex items-center gap-1.5 py-0.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-foreground truncate font-medium">
                          Ota-onasi: {st.parent_name}
                        </span>
                        {st.parent_phone && (
                          <a href={`tel:${st.parent_phone}`} className="text-blue-600 font-mono text-[11px] ml-auto shrink-0">
                            {st.parent_phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-2">
                    <Button asChild variant="outline" size="sm" className="h-9 text-xs flex-1">
                      <Link href={`/students/${st.id}`}>Profilni ko‘rish</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingStudent(st);
                        setFormDialogOpen(true);
                      }}
                      className="h-9 text-xs flex-1 gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Tahrirlash</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStudentToDelete(st);
                        setDeleteConfirmOpen(true);
                      }}
                      className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table (Visible on md and above) */}
          <Card className="hidden md:block shadow-sm overflow-hidden border-border/80">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">O‘quvchi</th>
                    <th className="px-4 py-3.5 font-semibold">Telefon</th>
                    <th className="px-4 py-3.5 font-semibold">Ota-onasi</th>
                    <th className="px-4 py-3.5 font-semibold">Guruhlari</th>
                    <th className="px-4 py-3.5 font-semibold">Holati</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((st) => {
                    const studentGroups = studentGroupsMap.get(st.id) || [];

                    return (
                      <tr
                        key={st.id}
                        className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <Link href={`/students/${st.id}`} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {st.first_name[0]}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground group-hover:text-blue-600 transition-colors block">
                                {st.first_name} {st.last_name || ""}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Qo‘shilgan: {formatDate(st.joined_at)}
                              </span>
                            </div>
                          </Link>
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                          {st.phone ? (
                            <a
                              href={`tel:${st.phone}`}
                              className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{st.phone}</span>
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-4 py-4 text-xs">
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{st.parent_name || "—"}</p>
                            {st.parent_phone && (
                              <p className="text-muted-foreground font-mono text-[11px]">
                                {st.parent_phone}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {studentGroups.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">
                                Biriktirilmagan
                              </span>
                            ) : (
                              studentGroups.map((grp) => (
                                <span
                                  key={grp.id}
                                  className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                >
                                  {grp.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={st.status} />
                        </td>

                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Amallar</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs">Amallar</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/students/${st.id}`} className="cursor-pointer">
                                  <span>Profilni ko‘rish</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingStudent(st);
                                  setFormDialogOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Edit className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span>Tahrirlash</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs">Holatni o‘zgartirish</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleStatusChange(st, "Faol")}>
                                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                                <span>Faol</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(st, "Ta’til")}>
                                <Clock className="w-4 h-4 mr-2 text-amber-600" />
                                <span>Ta’tilda</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(st, "Bitirgan")}>
                                <CheckCircle2 className="w-4 h-4 mr-2 text-blue-600" />
                                <span>Bitirgan</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(st, "Tark etgan")}>
                                <UserX className="w-4 h-4 mr-2 text-rose-600" />
                                <span>Tark etgan</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setStudentToDelete(st);
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

      {/* Add / Edit Student Dialog */}
      <StudentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        student={editingStudent}
        groups={groups}
        onSave={handleSaveStudent}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="O‘quvchini o‘chirishni tasdiqlaysizmi?"
        description={`"${studentToDelete?.first_name} ${studentToDelete?.last_name || ""}" tizimdan butunlay o‘chiriladi. Bu amalni ortga qaytarib bo‘lmaydi.`}
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        onConfirm={handleDeleteStudent}
      />
    </div>
  );
}
