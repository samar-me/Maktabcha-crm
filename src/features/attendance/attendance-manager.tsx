"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Group, Student, Lesson, AttendanceStatus, Attendance } from "@/types/database";
import { crmStore } from "@/services/crm-store";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Save,
  Check,
  Plus,
  UsersRound,
  History,
  TrendingUp,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

interface StudentAttendanceRow {
  student_id: string;
  student: Student;
  status: AttendanceStatus;
  note: string;
}

export function AttendanceManager() {
  const searchParams = useSearchParams();
  const initialGroupId = searchParams.get("groupId") || "";
  const initialLessonId = searchParams.get("lessonId") || "";

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>("");
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = React.useState<string>("");

  const [attendanceDate, setAttendanceDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceRows, setAttendanceRows] = React.useState<StudentAttendanceRow[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>("take");

  // Load Groups on mount
  React.useEffect(() => {
    const loadedGroups = crmStore.getGroups();
    setGroups(loadedGroups);

    if (loadedGroups.length > 0) {
      const targetGroup = initialGroupId && loadedGroups.some((g) => g.id === initialGroupId)
        ? initialGroupId
        : loadedGroups[0].id;
      setSelectedGroupId(targetGroup);
    }
  }, [initialGroupId]);

  // Load lessons for selected group
  React.useEffect(() => {
    if (!selectedGroupId) return;
    const groupLessons = crmStore.getLessons(selectedGroupId);
    setLessons(groupLessons);

    if (groupLessons.length > 0) {
      const targetLesson =
        initialLessonId && groupLessons.some((l) => l.id === initialLessonId)
          ? initialLessonId
          : groupLessons[0].id;
      setSelectedLessonId(targetLesson);

      const foundLesson = groupLessons.find((l) => l.id === targetLesson);
      if (foundLesson) {
        setAttendanceDate(foundLesson.date);
      }
    } else {
      setSelectedLessonId("new");
    }
  }, [selectedGroupId, initialLessonId]);

  // Load students & existing attendance for selected group and lesson
  React.useEffect(() => {
    if (!selectedGroupId) return;

    const groupStudents = crmStore.getStudentsByGroupId(selectedGroupId);
    const existingAttendance =
      selectedLessonId && selectedLessonId !== "new"
        ? crmStore.getAttendance(selectedLessonId)
        : [];

    const rows: StudentAttendanceRow[] = groupStudents.map((st) => {
      const existing = existingAttendance.find((a) => a.student_id === st.id);
      return {
        student_id: st.id,
        student: st,
        status: existing ? existing.status : "Keldi",
        note: existing?.note || "",
      };
    });

    setAttendanceRows(rows);
  }, [selectedGroupId, selectedLessonId]);

  // Bulk action: Mark All Present
  const handleMarkAllPresent = () => {
    setAttendanceRows((prev) =>
      prev.map((row) => ({
        ...row,
        status: "Keldi",
      }))
    );
    toast.success("Barcha o‘quvchilar «Keldi» deb belgilandi. Istisnolarni o‘zgartirishingiz mumkin.");
  };

  // Change individual status
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRows((prev) =>
      prev.map((row) => (row.student_id === studentId ? { ...row, status } : row))
    );
  };

  // Change individual note
  const handleSetNote = (studentId: string, note: string) => {
    setAttendanceRows((prev) =>
      prev.map((row) => (row.student_id === studentId ? { ...row, note } : row))
    );
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    if (!selectedGroupId || attendanceRows.length === 0) {
      toast.error("Davomat olish uchun guruhda o‘quvchilar bo‘lishi kerak");
      return;
    }

    setSaving(true);
    try {
      let lessonIdToUse = selectedLessonId;

      // If "new", create a lesson first
      if (lessonIdToUse === "new" || !lessonIdToUse) {
        const createdLesson = crmStore.saveLesson({
          group_id: selectedGroupId,
          date: attendanceDate,
          start_time: "14:00",
          end_time: "16:00",
          topic: `${formatDate(attendanceDate)} sanasidagi dars`,
          description: null,
          homework: null,
          status: "O‘tkazildi",
        });
        lessonIdToUse = createdLesson.id;
        setSelectedLessonId(createdLesson.id);
      }

      // Batch save attendance records
      crmStore.saveAttendanceBatch(
        lessonIdToUse,
        selectedGroupId,
        attendanceDate,
        attendanceRows.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          note: r.note,
        }))
      );

      // Update lesson status to "O‘tkazildi"
      const currentLesson = crmStore.getLessonById(lessonIdToUse);
      if (currentLesson && currentLesson.status !== "O‘tkazildi") {
        crmStore.saveLesson({ ...currentLesson, status: "O‘tkazildi" });
      }

      toast.success("Davomat muvaffaqiyatli saqlandi!");
    } catch {
      toast.error("Davomatni saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  // Statistics calculation for current view
  const totalStudents = attendanceRows.length;
  const presentCount = attendanceRows.filter((r) => r.status === "Keldi").length;
  const lateCount = attendanceRows.filter((r) => r.status === "Kechikdi").length;
  const excusedCount = attendanceRows.filter((r) => r.status === "Sababli").length;
  const absentCount = attendanceRows.filter((r) => r.status === "Kelmadi").length;
  const rate =
    totalStudents > 0
      ? Math.round(((presentCount + lateCount * 0.8 + excusedCount) / totalStudents) * 100)
      : 100;

  // Group overall attendance history
  const groupStats = selectedGroupId ? crmStore.getGroupAttendanceStats(selectedGroupId) : null;
  const allGroupAttendance = selectedGroupId ? crmStore.getAttendance(undefined, selectedGroupId) : [];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="take" className="gap-2">
              <CalendarCheck2 className="w-4 h-4" />
              <span>Tezkor Davomat</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              <span>Davomat Tarixi & Statistika</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === "take" && totalStudents > 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkAllPresent}
                className="gap-1.5 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100"
              >
                <Check className="w-4 h-4" />
                <span>Barchasi keldi</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSaveAttendance}
                disabled={saving}
                className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saqlanmoqda..." : "Davomatni saqlash"}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Tab 1: Take Attendance */}
        <TabsContent value="take" className="space-y-6">
          {/* Top Selection Filters Card */}
          <Card className="p-5 shadow-sm border-border/80">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Group Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">1. Guruhni tanlang</Label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  aria-label="Guruhni tanlang"
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {groups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name} ({grp.course_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lesson / Topic Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">2. Dars mavzusini tanlang</Label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedLessonId(val);
                    const found = lessons.find((l) => l.id === val);
                    if (found) setAttendanceDate(found.date);
                  }}
                  aria-label="Dars mavzusini tanlang"
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="new">+ Bugungi yangi dars uchun davomat</option>
                  {lessons.map((ls) => (
                    <option key={ls.id} value={ls.id}>
                      {ls.date} &bull; {ls.topic}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold" htmlFor="attDate">3. Dars sanasi</Label>
                <Input
                  id="attDate"
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </Card>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 rounded-xl border border-border bg-card shadow-sm">
              <span className="text-[11px] text-muted-foreground block">Jami o‘quvchilar</span>
              <span className="text-lg font-bold text-foreground">{totalStudents} nafar</span>
            </div>

            <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">Keldi</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{presentCount}</span>
            </div>

            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/20">
              <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium block">Kelmadi</span>
              <span className="text-lg font-bold text-rose-700 dark:text-rose-300">{absentCount}</span>
            </div>

            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-950 bg-amber-50/50 dark:bg-amber-950/20">
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium block">Kechikdi</span>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{lateCount}</span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl border border-blue-200 dark:border-blue-950 bg-blue-50/50 dark:bg-blue-950/20">
              <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium block">Ishtirok foizi</span>
              <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{rate}%</span>
            </div>
          </div>

          {/* Student Roster Attendance List */}
          {totalStudents === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="Guruhda o‘quvchilar mavjud emas"
              description="Ushbu guruhga hali o‘quvchilar biriktirilmagan. Guruh sahifasiga o‘tib o‘quvchilarni qo‘shing."
              actionLabel="Guruhlar bo‘limiga o‘tish"
              onAction={() => {
                if (selectedGroupId) {
                  window.location.href = `/groups/${selectedGroupId}`;
                }
              }}
            />
          ) : (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold">O‘quvchilar Davomat Jadvali</CardTitle>
                    <CardDescription className="text-xs">
                      Har bir o‘quvchi holatini belgilang yoki «Barchasi keldi» tugmasidan foydalaning
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {attendanceRows.map((row, index) => (
                    <div
                      key={row.student_id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/15 transition-colors"
                    >
                      {/* Left: Student info */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <span className="text-xs text-muted-foreground font-mono w-5">
                          {index + 1}.
                        </span>
                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {row.student.first_name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {row.student.first_name} {row.student.last_name || ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {row.student.phone || "Telefon kiritilmagan"}
                          </p>
                        </div>
                      </div>

                      {/* Center: 4 Quick Toggle Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetStatus(row.student_id, "Keldi")}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            row.status === "Keldi"
                              ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                              : "bg-muted/60 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Keldi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetStatus(row.student_id, "Kelmadi")}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            row.status === "Kelmadi"
                              ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30"
                              : "bg-muted/60 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Kelmadi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetStatus(row.student_id, "Kechikdi")}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            row.status === "Kechikdi"
                              ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30"
                              : "bg-muted/60 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Kechikdi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetStatus(row.student_id, "Sababli")}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            row.status === "Sababli"
                              ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30"
                              : "bg-muted/60 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Sababli</span>
                        </button>
                      </div>

                      {/* Right: Note input */}
                      <div className="sm:max-w-xs w-full">
                        <Input
                          value={row.note}
                          onChange={(e) => handleSetNote(row.student_id, e.target.value)}
                          placeholder="Sabab yoki izoh (ixtiyoriy)..."
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bottom Floating Save Button on Mobile / Desktop */}
          {totalStudents > 0 && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border shadow-md">
              <div className="text-xs">
                <span className="font-semibold text-foreground">
                  Ishtirok: {presentCount + lateCount} / {totalStudents} nafar o‘quvchi
                </span>
                <span className="text-muted-foreground block text-[11px]">
                  Sana: {formatDate(attendanceDate, "d-MMMM, yyyy")}
                </span>
              </div>

              <Button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saqlanmoqda..." : "Davomatni saqlash"}</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Attendance History & Statistics */}
        <TabsContent value="history" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="O‘rtacha ishtirok darajasi"
              value={`${groupStats?.rate || 100}%`}
              icon={TrendingUp}
              subtitle="Guruh umumiy davomati"
              iconColorClass="text-emerald-600 dark:text-emerald-400"
              iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
            />
            <StatCard
              title="Jami qayd etilgan davomatlar"
              value={`${allGroupAttendance.length} ta`}
              icon={CalendarCheck2}
              subtitle="Barcha darslar bo‘yicha yozuvlar"
              iconColorClass="text-blue-600 dark:text-blue-400"
              iconBgClass="bg-blue-50 dark:bg-blue-950/50"
            />
            <StatCard
              title="O‘tkazilgan darslar"
              value={`${lessons.filter((l) => l.status === "O‘tkazildi").length} ta`}
              icon={CheckCircle2}
              subtitle="Tugallangan darslar soni"
              iconColorClass="text-indigo-600 dark:text-indigo-400"
              iconBgClass="bg-indigo-50 dark:bg-indigo-950/50"
            />
          </div>

          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Oxirgi Davomat Tarixi</CardTitle>
              <CardDescription className="text-xs">
                Guruh bo‘yicha o‘tkazilgan darslar davomat yozuvlari
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {lessons.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Hozircha darslar tarixi mavjud emas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Sana</th>
                        <th className="px-4 py-3 font-semibold">Dars mavzusi</th>
                        <th className="px-4 py-3 font-semibold">Kelganlar soni</th>
                        <th className="px-4 py-3 font-semibold">Holati</th>
                        <th className="px-6 py-3 font-semibold text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lessons.map((ls) => {
                        const records = crmStore.getAttendance(ls.id);
                        const present = records.filter((r) => r.status === "Keldi").length;
                        const total = crmStore.getStudentsByGroupId(ls.group_id).length;

                        return (
                          <tr key={ls.id} className="hover:bg-muted/20">
                            <td className="px-6 py-3.5 text-xs font-mono font-medium text-foreground">
                              {formatDate(ls.date)}
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-foreground">{ls.topic}</td>
                            <td className="px-4 py-3.5 text-xs text-muted-foreground">
                              {records.length > 0 ? (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {present} / {total} keldi
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">Davomat olinmagan</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <StatusBadge status={ls.status} />
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => {
                                  setSelectedLessonId(ls.id);
                                  setAttendanceDate(ls.date);
                                  setActiveTab("take");
                                }}
                              >
                                <span>Tahrirlash</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
