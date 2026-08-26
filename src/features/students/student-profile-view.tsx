"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Student, Group, Payment, Attendance, Lesson, Grade, HomeworkSubmission, Homework } from "@/types/database";
import { crmStore } from "@/services/crm-store";
import { PageHeader } from "@/components/shared/page-header";
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
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  BookOpen,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

interface StudentProfileViewProps {
  studentId: string;
}

export function StudentProfileView({ studentId }: StudentProfileViewProps) {
  const router = useRouter();
  const [student, setStudent] = React.useState<Student | null>(null);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [allGroups, setAllGroups] = React.useState<Group[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = React.useState<Attendance[]>([]);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [studentGrades, setStudentGrades] = React.useState<Grade[]>([]);
  const [studentSubmissions, setStudentSubmissions] = React.useState<HomeworkSubmission[]>([]);
  const [allHomework, setAllHomework] = React.useState<Homework[]>([]);

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);

  const loadStudentData = React.useCallback(() => {
    const st = crmStore.getStudentById(studentId);
    if (!st) {
      setStudent(null);
      return;
    }
    setStudent(st);
    setGroups(crmStore.getGroupsByStudentId(studentId));
    setAllGroups(crmStore.getGroups());
    setPayments(crmStore.getPaymentsByStudentId(studentId));
    setAttendanceRecords(crmStore.getAttendance(undefined, undefined, studentId));
    setLessons(crmStore.getLessons());
    setStudentGrades(crmStore.getGrades(undefined, studentId));
    setStudentSubmissions(crmStore.getHomeworkSubmissions(undefined, studentId));
    setAllHomework(crmStore.getHomework());
  }, [studentId]);

  React.useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  if (!student) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/students">
            <ArrowLeft className="w-4 h-4" />
            <span>O‘quvchilar ro‘yxatiga qaytish</span>
          </Link>
        </Button>
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold">O‘quvchi topilmadi</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Bunday ID ga ega o‘quvchi mavjud emas yoki o‘chirilgan bo‘lishi mumkin.
          </p>
          <Button asChild size="sm">
            <Link href="/students">O‘quvchilar ro‘yxatiga o‘tish</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // Financial calculations
  const totalMonthlyFee = groups.reduce((acc, g) => acc + (Number(g.monthly_fee) || 0), 0);
  const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const currentDebt = Math.max(0, totalMonthlyFee - totalPaid);

  // Live Stats from Store
  const attStats = crmStore.getStudentAttendanceStats(student.id);
  const hwStats = crmStore.getStudentHomeworkStats(student.id);
  const grStats = crmStore.getStudentGradeStats(student.id);

  const handleUpdateStudent = async (values: StudentFormValues) => {
    try {
      crmStore.saveStudent({
        id: student.id,
        first_name: values.first_name,
        last_name: values.last_name || null,
        phone: values.phone || null,
        parent_name: values.parent_name || null,
        parent_phone: values.parent_phone || null,
        birth_date: values.birth_date || null,
        gender: values.gender || "Erkak",
        address: values.address || null,
        joined_at: student.joined_at,
        status: values.status,
        notes: values.notes || null,
        avatar_url: student.avatar_url,
      });

      if (values.group_id) {
        crmStore.addStudentToGroup(values.group_id, student.id);
      }

      toast.success("O‘quvchi ma'lumotlari yangilandi");
      loadStudentData();
    } catch {
      toast.error("O‘quvchini yangilashda xatolik");
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 self-start">
          <Link href="/students">
            <ArrowLeft className="w-4 h-4" />
            <span>O‘quvchilar ro‘yxatiga qaytish</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setFormDialogOpen(true)}
          >
            <Edit className="w-4 h-4" />
            <span>Tahrirlash</span>
          </Button>
          <Button size="sm" className="gap-2" asChild>
            <Link href={`/payments`}>
              <CreditCard className="w-4 h-4" />
              <span>To‘lov kiritish</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Student Header Card */}
      <Card className="p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-bold text-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
              {student.first_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {student.first_name} {student.last_name || ""}
                </h1>
                <StatusBadge status={student.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ro‘yxatga olingan sana: {formatDate(student.joined_at, "d-MMMM, yyyy")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
              <span className="text-muted-foreground block">Oylik to‘lov tarifi:</span>
              <MoneyDisplay amount={totalMonthlyFee} size="sm" variant="positive" />
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
              <span className="text-muted-foreground block">Jami to‘langan:</span>
              <MoneyDisplay amount={totalPaid} size="sm" variant="positive" />
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
              <span className="text-muted-foreground block">Qarzdorlik holati:</span>
              {currentDebt > 0 ? (
                <MoneyDisplay amount={currentDebt} size="sm" variant="negative" />
              ) : (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Qarz yo‘q (0 so‘m)</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Davomat ko‘rsatkichi"
          value={`${attStats.rate}%`}
          icon={CalendarCheck2}
          subtitle={`Jami ${attStats.total} darsdan ${attStats.present} tasiga kelgan`}
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <StatCard
          title="O‘rtacha bahosi"
          value={grStats.total > 0 ? `${grStats.averagePercent}%` : "100%"}
          icon={Award}
          subtitle={grStats.total > 0 ? `${grStats.total} ta sinov natijalari` : "Hozircha baholanmagan"}
          iconColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="Vazifalar bajarilishi"
          value={`${hwStats.rate}%`}
          icon={FileCheck2}
          subtitle={`${hwStats.completed} ta vazifa to‘liq bajarilgan`}
          iconColorClass="text-indigo-600 dark:text-indigo-400"
          iconBgClass="bg-indigo-50 dark:bg-indigo-950/50"
        />
        <StatCard
          title="Guruhlar soni"
          value={`${groups.length} ta`}
          icon={Users}
          subtitle={groups.map((g) => g.name).join(", ") || "Biriktirilmagan"}
          iconColorClass="text-purple-600 dark:text-purple-400"
          iconBgClass="bg-purple-50 dark:bg-purple-950/50"
        />
      </div>

      {/* Detailed Tabs: General Info, Groups, Payments, Attendance & Activity */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid grid-cols-4 max-w-xl">
          <TabsTrigger value="info">Ma'lumotlar</TabsTrigger>
          <TabsTrigger value="groups">Guruhlari</TabsTrigger>
          <TabsTrigger value="payments">To‘lovlar</TabsTrigger>
          <TabsTrigger value="academic">Davomat & Baholar</TabsTrigger>
        </TabsList>

        {/* Tab 1: General Info */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Shaxsiy & Aloqa Ma'lumotlari</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    To‘liq ismi:
                  </span>
                  <span className="font-semibold text-foreground">
                    {student.first_name} {student.last_name || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefon raqami:
                  </span>
                  <span className="font-mono font-medium text-foreground">{student.phone || "—"}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Tug‘ilgan sanasi:
                  </span>
                  <span className="text-foreground">{formatDate(student.birth_date)}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Jinsi:</span>
                  <span className="text-foreground">{student.gender || "Erkak"}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Manzili:
                  </span>
                  <span className="text-foreground text-right">{student.address || "—"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Ota-onasi & Izohlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Ota-onasi / Vasiy:</span>
                  <span className="font-semibold text-foreground">{student.parent_name || "—"}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Ota-onasi telefoni:</span>
                  <span className="font-mono font-medium text-foreground">{student.parent_phone || "—"}</span>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-muted-foreground block mb-1">Qo‘shimcha eslatmalar:</span>
                  <div className="p-3 rounded-xl bg-muted/40 text-xs text-foreground leading-relaxed border border-border/60">
                    {student.notes || "Eslatmalar kiritilmagan."}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Groups */}
        <TabsContent value="groups" className="space-y-4">
          {groups.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Bu o‘quvchi hozirda birorta ham guruhga a'zo emas</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setFormDialogOpen(true)}
              >
                Guruhga biriktirish
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map((grp) => (
                <Card key={grp.id} className="p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/groups/${grp.id}`}
                      className="font-bold text-base text-foreground hover:text-blue-600 transition-colors"
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
                  Ushbu o‘quvchi bo‘yicha amalga oshirilgan to‘lovlar ro‘yxati
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Hozircha to‘lov yozuvlari mavjud emas.
                </div>
              ) : (
                <div className="overflow-x-auto">
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Academic (Attendance, Grades & Homework) */}
        <TabsContent value="academic" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              {formatDate(att.date)} {lesson ? `&bull; ${lesson.topic}` : ""}
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
                    {studentGrades.map((gr) => {
                      const percent = Math.round((Number(gr.score) / Number(gr.max_score || 100)) * 100);
                      return (
                        <div key={gr.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/15">
                          <div>
                            <span className="font-semibold text-foreground block">{gr.title}</span>
                            <span className="text-[11px] text-muted-foreground">{formatDate(gr.date)}</span>
                          </div>
                          <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded">
                            {gr.score} / {gr.max_score || 100} ({percent}%)
                          </span>
                        </div>
                      );
                    })}
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
        onSave={handleUpdateStudent}
      />
    </div>
  );
}
