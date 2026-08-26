"use client";

import * as React from "react";
import Link from "next/link";
import { Student, Group, Payment, Attendance, Lesson, Grade, HomeworkSubmission } from "@/types/database";
import { getStudentById, updateStudent } from "@/services/students";
import { getGroups, getGroupsByStudentId, addStudentToGroup } from "@/services/groups";
import { getPaymentsByStudentId } from "@/services/payments";
import { getAttendance } from "@/services/attendance";
import { getLessons } from "@/services/lessons";
import { getGrades } from "@/services/grades";
import { getHomeworkSubmissions } from "@/services/homework";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { StatCard } from "@/components/shared/stat-card";
import { StudentFormDialog } from "./student-form-dialog";
import { StudentFormValues } from "./student-schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Phone,
  MapPin,
  Calendar,
  User,
  Users,
  CreditCard,
  CalendarCheck2,
  Award,
  FileCheck2,
  AlertCircle,
  BookOpen,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

interface StudentProfileViewProps {
  studentId: string;
}

export function StudentProfileView({ studentId }: StudentProfileViewProps) {
  const [student, setStudent] = React.useState<Student | null>(null);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [allGroups, setAllGroups] = React.useState<Group[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = React.useState<Attendance[]>([]);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [studentGrades, setStudentGrades] = React.useState<Grade[]>([]);
  const [studentSubmissions, setStudentSubmissions] = React.useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);

  const loadStudentData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const st = await getStudentById(studentId);
      if (!st) {
        setStudent(null);
        return;
      }
      setStudent(st);

      const [stGroups, totalGroups, stPayments, stAtt, allLessons, stGrades, stSubs] =
        await Promise.all([
          getGroupsByStudentId(studentId),
          getGroups(),
          getPaymentsByStudentId(studentId),
          getAttendance({ studentId }),
          getLessons(),
          getGrades({ studentId }),
          getHomeworkSubmissions({ studentId }),
        ]);

      setGroups(stGroups);
      setAllGroups(totalGroups);
      setPayments(stPayments);
      setAttendanceRecords(stAtt);
      setLessons(allLessons);
      setStudentGrades(stGrades);
      setStudentSubmissions(stSubs);
    } catch {
      setError("O‘quvchi ma'lumotlarini yuklashda xatolik yuz berdi");
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  React.useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  const handleSaveStudent = async (values: StudentFormValues) => {
    if (!student) return;
    try {
      await updateStudent(student.id, {
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

      if (values.group_id && !groups.some((g) => g.id === values.group_id)) {
        await addStudentToGroup(values.group_id, student.id);
      }

      toast.success("O‘quvchi ma'lumotlari muvaffaqiyatli saqlandi");
      await loadStudentData();
    } catch {
      toast.error("Saqlashda xatolik yuz berdi");
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-xs font-medium">O‘quvchi profili yuklanmoqda...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <div>
          <h2 className="text-base font-bold text-foreground">
            {error || "O‘quvchi topilmadi"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Qidirilayotgan o‘quvchi tizimda mavjud emas yoki o‘chirilgan bo‘lishi mumkin.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          {error && (
            <Button variant="outline" size="sm" onClick={loadStudentData} className="gap-1.5 text-xs">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Qayta urinish</span>
            </Button>
          )}
          <Button asChild size="sm" className="text-xs">
            <Link href="/students">O‘quvchilar ro‘yxatiga qaytish</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Calculations
  const totalMonthlyFee = groups.reduce((sum, g) => sum + (Number(g.monthly_fee) || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const currentDebt = Math.max(0, totalMonthlyFee - totalPaid);

  const presentCount = attendanceRecords.filter((a) => a.status === "Keldi" || a.status === "Kechikdi").length;
  const attendanceRate =
    attendanceRecords.length > 0
      ? Math.round((presentCount / attendanceRecords.length) * 100)
      : 100;

  const averageGrade =
    studentGrades.length > 0
      ? Math.round(
          studentGrades.reduce((sum, g) => sum + (Number(g.score) / (Number(g.max_score) || 100)) * 100, 0) /
            studentGrades.length
        )
      : 0;

  const completedHw = studentSubmissions.filter((s) => s.status === "Bajarildi" || s.status === "Qisman").length;
  const homeworkRate =
    studentSubmissions.length > 0
      ? Math.round((completedHw / studentSubmissions.length) * 100)
      : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 self-start h-9 text-xs">
          <Link href="/students">
            <ArrowLeft className="w-4 h-4" />
            <span>O‘quvchilar ro‘yxatiga qaytish</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-9 flex-1 sm:flex-initial"
            onClick={() => setFormDialogOpen(true)}
          >
            <Edit className="w-4 h-4" />
            <span>Tahrirlash</span>
          </Button>
          <Button size="sm" className="gap-1.5 text-xs h-9 flex-1 sm:flex-initial" asChild>
            <Link href={`/payments`}>
              <CreditCard className="w-4 h-4" />
              <span>To‘lov kiritish</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Student Header Card */}
      <Card className="p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 text-white font-bold text-xl sm:text-2xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              {student.first_name[0]}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {student.first_name} {student.last_name || ""}
                </h1>
                <StatusBadge status={student.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Qo‘shilgan: {formatDate(student.joined_at, "d-MMMM, yyyy")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full lg:w-auto text-xs">
            <div className="p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
              <span className="text-[11px] text-muted-foreground block truncate">Tarif</span>
              <MoneyDisplay amount={totalMonthlyFee} size="sm" variant="positive" />
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
              <span className="text-[11px] text-muted-foreground block truncate">To‘langan</span>
              <MoneyDisplay amount={totalPaid} size="sm" variant="positive" />
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
              <span className="text-[11px] text-muted-foreground block truncate">Qarz</span>
              {currentDebt > 0 ? (
                <MoneyDisplay amount={currentDebt} size="sm" variant="negative" />
              ) : (
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">0 so‘m</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Davomat"
          value={`${attendanceRate}%`}
          icon={CalendarCheck2}
          subtitle={`${attendanceRecords.length} darsdan ${presentCount} tasiga kelgan`}
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <StatCard
          title="O‘rtacha baho"
          value={`${averageGrade}%`}
          icon={Award}
          subtitle={studentGrades.length > 0 ? `${studentGrades.length} ta baho` : "Baholanmagan"}
          iconColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="Uy vazifasi"
          value={`${homeworkRate}%`}
          icon={FileCheck2}
          subtitle={`${completedHw} ta vazifa topshirilgan`}
          iconColorClass="text-indigo-600 dark:text-indigo-400"
          iconBgClass="bg-indigo-50 dark:bg-indigo-950/50"
        />
        <StatCard
          title="Guruhlari"
          value={`${groups.length} ta`}
          icon={Users}
          subtitle={groups.map((g) => g.name).join(", ") || "Biriktirilmagan"}
          iconColorClass="text-purple-600 dark:text-purple-400"
          iconBgClass="bg-purple-50 dark:bg-purple-950/50"
        />
      </div>

      {/* Detailed Tabs: General Info, Groups, Payments, Academic */}
      <Tabs defaultValue="info" className="space-y-4">
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <TabsList className="flex w-max min-w-full sm:min-w-0 justify-start sm:justify-center p-1 bg-muted/60 rounded-xl gap-1">
            <TabsTrigger value="info" className="text-xs font-semibold py-2 px-3 shrink-0">
              Ma'lumotlar
            </TabsTrigger>
            <TabsTrigger value="groups" className="text-xs font-semibold py-2 px-3 shrink-0">
              Guruhlari ({groups.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs font-semibold py-2 px-3 shrink-0">
              To‘lovlar ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="academic" className="text-xs font-semibold py-2 px-3 shrink-0">
              Davomat & Baholar
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: General Info */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Shaxsiy & Aloqa Ma'lumotlari</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center gap-2 text-xs">
                    <User className="w-4 h-4 text-muted-foreground" />
                    To‘liq ismi:
                  </span>
                  <span className="font-semibold text-foreground text-xs">
                    {student.first_name} {student.last_name || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Phone className="w-4 h-4 text-blue-600" />
                    Telefon raqami:
                  </span>
                  {student.phone ? (
                    <a href={`tel:${student.phone}`} className="font-mono font-medium text-blue-600 hover:underline text-xs">
                      {student.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Tug‘ilgan sanasi:
                  </span>
                  <span className="text-foreground text-xs">{formatDate(student.birth_date)}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground text-xs">Jinsi:</span>
                  <span className="text-foreground text-xs">{student.gender || "Erkak"}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center gap-2 text-xs">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Manzili:
                  </span>
                  <span className="text-foreground text-right text-xs">{student.address || "—"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Ota-onasi & Izohlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground text-xs">Ota-onasi:</span>
                  <span className="font-semibold text-foreground text-xs">
                    {student.parent_name || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground text-xs">Ota-onasining telefoni:</span>
                  {student.parent_phone ? (
                    <a href={`tel:${student.parent_phone}`} className="font-mono font-medium text-blue-600 hover:underline text-xs">
                      {student.parent_phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </div>

                <div className="py-2 border-b border-border/60 space-y-1">
                  <span className="text-muted-foreground text-xs block">Qo‘shimcha izoh:</span>
                  <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-lg">
                    {student.notes || "Izoh kiritilmagan."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Groups */}
        <TabsContent value="groups" className="space-y-4">
          {groups.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <p className="text-xs text-muted-foreground">O‘quvchi hali birorta guruhga biriktirilmagan.</p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setFormDialogOpen(true)}
              >
                Guruhga biriktirish
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map((grp) => (
                <Card key={grp.id} className="p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/groups/${grp.id}`}
                      className="font-bold text-base text-foreground hover:text-blue-600 transition-colors truncate"
                    >
                      {grp.name}
                    </Link>
                    <StatusBadge status={grp.status} />
                  </div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {grp.course_name}
                  </p>
                  <div className="p-3 rounded-xl bg-muted/40 text-xs space-y-1.5 border border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">O‘qituvchi:</span>
                      <span className="font-semibold text-foreground">{grp.teacher_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Oylik to‘lov:</span>
                      <MoneyDisplay amount={grp.monthly_fee} size="sm" variant="positive" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Payments */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">To‘lovlar Tarixi</CardTitle>
                <CardDescription className="text-xs">
                  Ushbu o‘quvchi bo‘yicha amalga oshirilgan to‘lovlar
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Hozircha to‘lov yozuvlari mavjud emas.
                </div>
              ) : (
                <>
                  {/* Mobile payment cards */}
                  <div className="divide-y divide-border md:hidden">
                    {payments.map((pmt) => (
                      <div key={pmt.id} className="p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            {pmt.month}-oy, {pmt.year}-yil
                          </span>
                          <MoneyDisplay amount={pmt.amount} size="sm" variant="positive" />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{formatDate(pmt.payment_date)}</span>
                          <span className="px-2 py-0.5 rounded bg-muted font-medium text-foreground">
                            {pmt.payment_method}
                          </span>
                        </div>
                        {pmt.note && (
                          <p className="text-[11px] text-muted-foreground italic">
                            Izoh: {pmt.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Sana</th>
                          <th className="px-4 py-3 font-semibold">To‘lov davri</th>
                          <th className="px-4 py-3 font-semibold">Usuli</th>
                          <th className="px-4 py-3 font-semibold">Izoh</th>
                          <th className="px-6 py-3 font-semibold text-right">Summa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payments.map((pmt) => (
                          <tr key={pmt.id} className="hover:bg-muted/20">
                            <td className="px-6 py-3 text-xs">{formatDate(pmt.payment_date)}</td>
                            <td className="px-4 py-3 font-medium text-foreground">
                              {pmt.month}-oy, {pmt.year}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className="px-2 py-0.5 rounded bg-muted font-medium">
                                {pmt.payment_method}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {pmt.note || "—"}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <MoneyDisplay amount={pmt.amount} size="sm" variant="positive" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Academic (Attendance & Grades) */}
        <TabsContent value="academic" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Attendance Records */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Davomat Yozuvlari</CardTitle>
                <CardDescription className="text-xs">Darslardagi ishtirok holati</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {attendanceRecords.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Davomat yozuvlari mavjud emas.
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                    {attendanceRecords.map((att) => {
                      const lesson = lessons.find((l) => l.id === att.lesson_id);
                      return (
                        <div key={att.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/15">
                          <div>
                            <span className="font-semibold text-foreground block">
                              {formatDate(att.date)} {lesson ? `• ${lesson.topic}` : ""}
                            </span>
                            {att.note && <span className="text-[11px] text-muted-foreground">{att.note}</span>}
                          </div>
                          <StatusBadge status={att.status} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grades Records */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Baholar & Sinov Natijalari</CardTitle>
                <CardDescription className="text-xs">Nazorat va imtihon ballari</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {studentGrades.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Baholash natijalari mavjud emas.
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                    {studentGrades.map((grd) => (
                      <div key={grd.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/15">
                        <div>
                          <span className="font-semibold text-foreground block">{grd.title}</span>
                          <span className="text-[11px] text-muted-foreground">{formatDate(grd.date)}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {grd.score} / {grd.max_score}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            ({Math.round(((grd.score || 0) / (grd.max_score || 100)) * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Student Dialog */}
      <StudentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        student={student}
        groups={allGroups}
        onSave={handleSaveStudent}
      />
    </div>
  );
}
