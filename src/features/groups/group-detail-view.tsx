"use client";

import * as React from "react";
import Link from "next/link";
import { Group, Student, Lesson, ScheduleItem, Attendance } from "@/types/database";
import {
  getGroupById,
  updateGroup,
  getStudentsByGroupId,
  addStudentToGroup,
  removeStudentFromGroup,
} from "@/services/groups";
import { getStudents } from "@/services/students";
import { getLessons } from "@/services/lessons";
import { getAttendance } from "@/services/attendance";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { StatCard } from "@/components/shared/stat-card";
import { GroupFormDialog } from "./group-form-dialog";
import { AddStudentToGroupDialog } from "./add-student-to-group-dialog";
import { GroupFormValues } from "./group-schema";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { excelExport } from "@/lib/excel-export";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  UserPlus,
  Users,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  CalendarCheck2,
  BookOpen,
  UserMinus,
  AlertCircle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

interface GroupDetailViewProps {
  groupId: string;
}

export function GroupDetailView({ groupId }: GroupDetailViewProps) {
  const [group, setGroup] = React.useState<Group | null>(null);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [allStudents, setAllStudents] = React.useState<Student[]>([]);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [attendanceRecords, setAttendanceRecords] = React.useState<Attendance[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [addStudentDialogOpen, setAddStudentDialogOpen] = React.useState(false);

  const [removeConfirmOpen, setRemoveConfirmOpen] = React.useState(false);
  const [studentToRemove, setStudentToRemove] = React.useState<Student | null>(null);

  const loadGroupData = React.useCallback(async () => {
    try {
      setLoading(true);
      const grp = await getGroupById(groupId);
      if (!grp) {
        setGroup(null);
        return;
      }
      setGroup(grp);

      const [grpStudents, totalStudents, grpLessons, grpAtt] = await Promise.all([
        getStudentsByGroupId(groupId),
        getStudents(),
        getLessons(groupId),
        getAttendance({ groupId }),
      ]);

      setStudents(grpStudents);
      setAllStudents(totalStudents);
      setLessons(grpLessons);
      setAttendanceRecords(grpAtt);
    } catch {
      toast.error("Guruh ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  React.useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-xs">Guruh ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/groups">
            <ArrowLeft className="w-4 h-4" />
            <span>Guruhlar ro‘yxatiga qaytish</span>
          </Link>
        </Button>
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold">Guruh topilmadi</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Bunday ID ga ega guruh mavjud emas yoki o‘chirilgan bo‘lishi mumkin.
          </p>
          <Button asChild size="sm">
            <Link href="/groups">Guruhlar ro‘yxatiga o‘tish</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const expectedMonthlyRevenue = students.length * Number(group.monthly_fee || 0);

  const presentCount = attendanceRecords.filter((a) => a.status === "Keldi").length;
  const attendanceRate =
    attendanceRecords.length > 0
      ? Math.round((presentCount / attendanceRecords.length) * 100)
      : 100;

  const scheduleItems: ScheduleItem[] = (Array.isArray(group.schedule) ? group.schedule : []) as ScheduleItem[];
  const availableStudentsToAdd = allStudents.filter((s) => !students.some((cur) => cur.id === s.id));

  const handleUpdateGroup = async (values: GroupFormValues) => {
    try {
      await updateGroup(group.id, {
        name: values.name,
        course_name: values.course_name,
        teacher_name: values.teacher_name,
        monthly_fee: values.monthly_fee,
        room: values.room || null,
        start_date: values.start_date || group.start_date,
        status: values.status,
        schedule: values.schedule,
      });

      toast.success("Guruh ma'lumotlari yangilandi");
      await loadGroupData();
    } catch {
      toast.error("Guruhni yangilashda xatolik");
    }
  };

  const handleAddStudent = async (studentId: string) => {
    try {
      await addStudentToGroup(group.id, studentId);
      toast.success("O‘quvchi guruhga muvaffaqiyatli biriktirildi");
      await loadGroupData();
    } catch {
      toast.error("O‘quvchini biriktirishda xatolik");
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToRemove) return;
    try {
      await removeStudentFromGroup(group.id, studentToRemove.id);
      toast.success(`${studentToRemove.first_name} guruhdan chiqarildi`);
      setRemoveConfirmOpen(false);
      setStudentToRemove(null);
      await loadGroupData();
    } catch {
      toast.error("O‘quvchini chiqarishda xatolik");
    }
  };

  const handleExportExcel = () => {
    if (students.length === 0) {
      toast.error("Eksport qilish uchun o‘quvchilar mavjud emas");
      return;
    }
    excelExport.exportStudents(students, [group]);
    toast.success(`"${group.name}" o‘quvchilari Excelga yuklandi!`);
  };

  return (
    <div className="space-y-6">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 self-start">
          <Link href="/groups">
            <ArrowLeft className="w-4 h-4" />
            <span>Guruhlar ro‘yxatiga qaytish</span>
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2 text-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excelga yuklash</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setFormDialogOpen(true)}
          >
            <Edit className="w-4 h-4" />
            <span>Tahrirlash</span>
          </Button>

          <Button
            size="sm"
            className="gap-2"
            onClick={() => setAddStudentDialogOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            <span>O‘quvchi qo‘shish</span>
          </Button>
        </div>
      </div>

      {/* Main Group Header Card */}
      <Card className="p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {group.name}
              </h1>
              <StatusBadge status={group.status} />
            </div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {group.course_name}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-foreground" />
                O‘qituvchi: <strong className="text-foreground font-semibold">{group.teacher_name}</strong>
              </span>
              {group.room && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-foreground" />
                  Xona: <strong className="text-foreground font-semibold">{group.room}</strong>
                </span>
              )}
              {group.start_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-foreground" />
                  Boshlangan: <strong className="text-foreground font-semibold">{formatDate(group.start_date)}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
              <span className="text-muted-foreground block">Oylik to‘lov tarifi:</span>
              <MoneyDisplay amount={group.monthly_fee} size="sm" variant="positive" />
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
              <span className="text-muted-foreground block">Kutilayotgan tushum:</span>
              <MoneyDisplay amount={expectedMonthlyRevenue} size="sm" variant="positive" />
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="O‘quvchilar soni"
          value={`${students.length} nafar`}
          icon={Users}
          subtitle="Faol ta'lim olayotganlar"
          iconColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="O‘rtacha davomat"
          value={`${attendanceRate}%`}
          icon={CalendarCheck2}
          subtitle="Guruh qatnashish darajasi"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <StatCard
          title="Kutilayotgan tushum"
          value={<MoneyDisplay amount={expectedMonthlyRevenue} size="md" variant="positive" />}
          icon={CreditCard}
          subtitle="Oylik jami to‘lov hajmi"
          iconColorClass="text-indigo-600 dark:text-indigo-400"
          iconBgClass="bg-indigo-50 dark:bg-indigo-950/50"
        />
        <StatCard
          title="Darslar soni"
          value={`${lessons.length} ta`}
          icon={BookOpen}
          subtitle="Reja va o‘tkazilgan darslar"
          iconColorClass="text-purple-600 dark:text-purple-400"
          iconBgClass="bg-purple-50 dark:bg-purple-950/50"
        />
      </div>

      {/* Tabs: Student Roster, Schedule, Lessons */}
      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="roster">O‘quvchilar ({students.length})</TabsTrigger>
          <TabsTrigger value="schedule">Dars Jadvali</TabsTrigger>
          <TabsTrigger value="lessons">Darslar ({lessons.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Student Roster */}
        <TabsContent value="roster" className="space-y-4">
          {students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Guruhda hali o‘quvchilar yo‘q"
              description="Ushbu guruhga o‘quvchilarni biriktirib, dars jarayonini boshlang."
              actionLabel="O‘quvchi qo‘shish"
              onAction={() => setAddStudentDialogOpen(true)}
            />
          ) : (
            <Card className="shadow-sm overflow-hidden border-border/80">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">O‘quvchi</th>
                      <th className="px-4 py-3.5 font-semibold">Telefon</th>
                      <th className="px-4 py-3.5 font-semibold">Ota-onasi</th>
                      <th className="px-4 py-3.5 font-semibold">Holati</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {students.map((st) => (
                      <tr key={st.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <Link href={`/students/${st.id}`} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                              {st.first_name[0]}
                            </div>
                            <span className="font-semibold text-foreground hover:text-blue-600 transition-colors">
                              {st.first_name} {st.last_name || ""}
                            </span>
                          </Link>
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                          {st.phone || "—"}
                        </td>

                        <td className="px-4 py-4 text-xs">
                          <p className="font-medium text-foreground">{st.parent_name || "—"}</p>
                          <p className="text-muted-foreground font-mono text-[11px]">{st.parent_phone || ""}</p>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={st.status} />
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setStudentToRemove(st);
                              setRemoveConfirmOpen(true);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-8"
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            <span>Guruhdan chiqarish</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Schedule */}
        <TabsContent value="schedule" className="space-y-4">
          <Card className="p-6 shadow-sm">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Haftalik Dars Jadvali</span>
            </h3>

            {scheduleItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ushbu guruh uchun dars jadvali kiritilmagan.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {scheduleItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-1"
                  >
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
                      {item.day}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-foreground">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {item.start_time} — {item.end_time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab 3: Lessons */}
        <TabsContent value="lessons" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Ushbu guruh bo‘yicha o‘tkazilgan va rejadagi darslar
            </span>
            <Button asChild size="sm" className="gap-1.5 text-xs">
              <Link href={`/lessons`}>
                <BookOpen className="w-3.5 h-3.5" />
                <span>Darslar jurnali</span>
              </Link>
            </Button>
          </div>

          {lessons.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted-foreground">
              Hozircha darslar kiritilmagan.
            </Card>
          ) : (
            <div className="space-y-3">
              {lessons.map((ls) => (
                <Card key={ls.id} className="p-4 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-muted-foreground">
                        {formatDate(ls.date)}
                      </span>
                      <StatusBadge status={ls.status} />
                    </div>
                    <p className="font-bold text-sm text-foreground">{ls.topic}</p>
                  </div>

                  <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
                    <Link href={`/attendance?groupId=${group.id}&lessonId=${ls.id}`}>
                      <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Davomat</span>
                    </Link>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Group Dialog */}
      <GroupFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        group={group}
        onSave={handleUpdateGroup}
      />

      {/* Add Student To Group Dialog */}
      <AddStudentToGroupDialog
        open={addStudentDialogOpen}
        onOpenChange={setAddStudentDialogOpen}
        availableStudents={availableStudentsToAdd}
        onAddStudent={handleAddStudent}
      />

      {/* Remove Student Confirmation */}
      <ConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={setRemoveConfirmOpen}
        title="O‘quvchini guruhdan chiqarishni tasdiqlaysizmi?"
        description={`"${studentToRemove?.first_name} ${studentToRemove?.last_name || ""}" ushbu guruh tarkibidan chiqariladi.`}
        confirmText="Ha, chiqarilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        onConfirm={handleRemoveStudent}
      />
    </div>
  );
}
