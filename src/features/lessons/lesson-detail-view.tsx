"use client";

import * as React from "react";
import Link from "next/link";
import { Lesson, Group, Student, Attendance } from "@/types/database";
import { getLessonById } from "@/services/lessons";
import { getGroupById, getStudentsByGroupId } from "@/services/groups";
import { getAttendance } from "@/services/attendance";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCurriculumItemByIdAction } from "@/actions/curriculum";
import { CurriculumItem } from "@/types/curriculum";
import {
  ArrowLeft,
  CalendarCheck2,
  FileCheck2,
  BookOpen,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

interface LessonDetailViewProps {
  lessonId: string;
}

export function LessonDetailView({ lessonId }: LessonDetailViewProps) {
  const [lesson, setLesson] = React.useState<Lesson | null>(null);
  const [group, setGroup] = React.useState<Group | null>(null);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [curriculumItem, setCurriculumItem] = React.useState<CurriculumItem | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const ls = await getLessonById(lessonId);
        if (!ls) {
          setLesson(null);
          return;
        }
        setLesson(ls);

        const promises: Promise<any>[] = [
          getGroupById(ls.group_id),
          getStudentsByGroupId(ls.group_id),
          getAttendance({ lessonId: ls.id }),
        ];

        if (ls.curriculum_item_id) {
          promises.push(
            getCurriculumItemByIdAction(ls.curriculum_item_id).catch(() => ({
              success: false,
              data: null,
            }))
          );
        }

        const [grp, grpStudents, att, cItemRes] = await Promise.all(promises);

        setGroup(grp);
        setStudents(grpStudents);
        setAttendance(att);
        if (cItemRes?.data) setCurriculumItem(cItemRes.data);
      } catch {
        toast.error("Dars ma'lumotlarini yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [lessonId]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-xs">Dars ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/lessons">
            <ArrowLeft className="w-4 h-4" />
            <span>Darslar ro‘yxatiga qaytish</span>
          </Link>
        </Button>
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold">Dars topilmadi</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Bunday ID ga ega dars mavjud emas yoki o‘chirilgan bo‘lishi mumkin.
          </p>
          <Button asChild size="sm">
            <Link href="/lessons">Darslar ro‘yxatiga o‘tish</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const presentCount = attendance.filter((a) => a.status === "Keldi").length;
  const totalCount = students.length;

  return (
    <div className="space-y-6">
      {/* Back button & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 self-start">
          <Link href="/lessons">
            <ArrowLeft className="w-4 h-4" />
            <span>Darslar ro‘yxatiga qaytish</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild size="sm" variant="outline" className="gap-1.5 border-blue-200 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40">
            <Link href={`/assignments/new?mode=ai&lessonId=${lesson.id}&groupId=${lesson.group_id}`}>
              <Sparkles className="w-4 h-4" />
              <span>Shu darsdan test yaratish</span>
            </Link>
          </Button>

          <Button asChild size="sm" className="gap-1.5">
            <Link href={`/attendance?groupId=${lesson.group_id}&lessonId=${lesson.id}`}>
              <CalendarCheck2 className="w-4 h-4" />
              <span>Davomatni tahrirlash</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Lesson Header Card */}
      <Card className="p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {group?.name || "Guruh"}
              </span>
              <StatusBadge status={lesson.status} />

              {curriculumItem && (
                <Link
                  href={`/curriculum/${curriculumItem.curriculum_id}/items/${curriculumItem.id}`}
                  className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1"
                >
                  <Layers className="w-3 h-3" />
                  <span>Ish reja: №{curriculumItem.order_number}</span>
                </Link>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {lesson.topic}
            </h1>
            <p className="text-xs text-muted-foreground">
              {formatDate(lesson.date, "EEEE, d-MMMM, yyyy")} &bull; {lesson.start_time} - {lesson.end_time}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
            <span className="text-muted-foreground block">Ishtirok ko‘rsatkichi:</span>
            <span className="font-bold text-base text-foreground">
              {presentCount} / {totalCount} keldi ({totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100}%)
            </span>
          </div>
        </div>
      </Card>

      {/* Grid: Attendance & Homework for this lesson */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Attendance Table */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Ushbu Darsdagi Davomat</CardTitle>
            <CardDescription className="text-xs">O‘quvchilarning ishtirok holati</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-semibold">O‘quvchi</th>
                    <th className="px-4 py-3 font-semibold">Holati</th>
                    <th className="px-6 py-3 text-right font-semibold">Izoh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((st) => {
                    const att = attendance.find((a) => a.student_id === st.id);
                    return (
                      <tr key={st.id} className="hover:bg-muted/20">
                        <td className="px-6 py-3 font-medium text-foreground">
                          {st.first_name} {st.last_name || ""}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={att ? att.status : "Kiritilmagan"} />
                        </td>
                        <td className="px-6 py-3 text-right text-xs text-muted-foreground">
                          {att?.note || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right: Homework & Description */}
        <div className="space-y-4">
          <Card className="p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <FileCheck2 className="w-5 h-5" />
              <h3 className="font-bold text-base">Berilgan Uy Vazifasi</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {lesson.homework || "Ushbu dars uchun uy vazifasi berilmagan."}
            </p>
          </Card>

          <Card className="p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
              <h3 className="font-bold text-base">Dars Tavsifi & Rejasi</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {lesson.description || "Dars tavsifi kiritilmagan."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
