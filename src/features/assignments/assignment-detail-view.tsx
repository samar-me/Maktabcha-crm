"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AssignmentDetailWithQuestions,
  AdminParticipantProgress,
} from "@/types/assignment";
import {
  getAssignmentByIdAction,
  getAssignmentProgressAction,
  publishAssignmentAction,
  finalizeAssignmentAction,
  resetStudentAttemptAction,
  duplicateAssignmentAction,
  deleteAssignmentAction,
} from "@/actions/assignments";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Send,
  Trophy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Copy,
  Edit,
  Trash2,
  Users,
  Target,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  Loader2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

interface AssignmentDetailViewProps {
  assignmentId: string;
}

export function AssignmentDetailView({ assignmentId }: AssignmentDetailViewProps) {
  const router = useRouter();
  const [assignment, setAssignment] = React.useState<AssignmentDetailWithQuestions | null>(null);
  const [progressList, setProgressList] = React.useState<AdminParticipantProgress[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Modals
  const [finalizeConfirmOpen, setFinalizeConfirmOpen] = React.useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const [selectedStudentForReset, setSelectedStudentForReset] = React.useState<AdminParticipantProgress | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      const [assRes, progRes] = await Promise.all([
        getAssignmentByIdAction(assignmentId),
        getAssignmentProgressAction(assignmentId),
      ]);
      setAssignment(assRes.data);
      setProgressList(progRes.data || []);
    } catch {
      toast.error("Topshiriq ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(loadData, 10000); // Poll every 10s for live progress

  const handlePublish = async () => {
    setActionLoading(true);
    try {
      const res = await publishAssignmentAction(assignmentId, true);
      if (res.success) {
        toast.success("Topshiriq faollashtirildi va Telegram guruhiga yuborildi!");
        await loadData();
      } else {
        toast.error(res.error || "E'lon qilishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    setActionLoading(true);
    try {
      const res = await finalizeAssignmentAction(assignmentId);
      if (res.success) {
        toast.success("Topshiriq yakunlandi va Telegram guruhiga natijalar yuborildi!");
        setFinalizeConfirmOpen(false);
        await loadData();
      } else {
        toast.error(res.error || "Yakunlashda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetAttempt = async () => {
    if (!selectedStudentForReset) return;
    setActionLoading(true);
    try {
      const res = await resetStudentAttemptAction(assignmentId, selectedStudentForReset.studentId);
      if (res.success) {
        toast.success(`${selectedStudentForReset.displayName} ning urinishi qayta tiklandi`);
        setResetConfirmOpen(false);
        setSelectedStudentForReset(null);
        await loadData();
      } else {
        toast.error(res.error || "Tiklashda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setActionLoading(true);
    try {
      const res = await duplicateAssignmentAction(assignmentId);
      if (res.success && res.newId) {
        toast.success("Topshiriqdan nusxa olindi");
        router.push(`/assignments/${res.newId}`);
      } else {
        toast.error(res.error || "Nusxa olishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const res = await deleteAssignmentAction(assignmentId);
      if (res.success) {
        toast.success("Topshiriq o‘chirildi");
        router.push("/assignments");
      } else {
        toast.error(res.error || "O‘chirishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !assignment) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Topshiriq ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  const isDraft = assignment.status === "Qoralama";
  const isActive = assignment.status === "Faol";
  const isFinalized = assignment.status === "Yakunlangan";

  const totalParticipants = assignment.stats?.totalParticipants || 0;
  const completedCount = assignment.stats?.completedCount || 0;
  const inProgressCount = assignment.stats?.inProgressCount || 0;
  const notStartedCount = assignment.stats?.notStartedCount || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 self-start h-9 text-xs">
          <Link href="/assignments">
            <ArrowLeft className="w-4 h-4" />
            <span>Topshiriqlar ro‘yxatiga qaytish</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          {isDraft && (
            <>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5 text-xs h-9"
              >
                <Link href={`/assignments/${assignment.id}/edit`}>
                  <Edit className="w-3.5 h-3.5" />
                  <span>Tahrirlash</span>
                </Link>
              </Button>

              <Button
                size="sm"
                onClick={handlePublish}
                disabled={actionLoading}
                className="gap-1.5 text-xs h-9 bg-sky-600 hover:bg-sky-700 text-white"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Telegramga e'lon qilish</span>
              </Button>
            </>
          )}

          {isActive && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => setFinalizeConfirmOpen(true)}
                disabled={actionLoading}
                className="gap-1.5 text-xs h-9 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Topshiriqni yakunlash</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handlePublish}
                disabled={actionLoading}
                className="gap-1.5 text-xs h-9 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Qayta yuborish</span>
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleDuplicate}
            disabled={actionLoading}
            className="gap-1.5 text-xs h-9"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Nusxa olish</span>
          </Button>

          {isDraft && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={actionLoading}
              className="text-xs h-9 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Assignment Banner Card */}
      <Card className="p-4 sm:p-6 shadow-sm border border-border">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                {assignment.groupName}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isActive
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  : isFinalized
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                  : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
              }`}>
                {assignment.status}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {assignment.title}
            </h1>

            {assignment.description && (
              <p className="text-xs text-muted-foreground max-w-2xl">
                {assignment.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
              <span>Savollar: <b>{assignment.questions.length} ta</b></span>
              <span>•</span>
              <span>1-o‘rin bali: <b>{assignment.scoring_base_points} ball</b></span>
              <span>•</span>
              <span>
                Yaratilgan: {formatDate(assignment.created_at, "d-MMMM, yyyy HH:mm")}
              </span>
              {assignment.telegramLink && (
                <>
                  <span>•</span>
                  <span className="text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1">
                    <Send className="w-3 h-3" />
                    {assignment.telegramLink.telegram_chat_title}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto shrink-0">
            <div className="p-3 rounded-xl bg-muted/50 border border-border text-center">
              <span className="text-[11px] text-muted-foreground block">Topshirish darajasi</span>
              <span className="font-bold text-base text-foreground">
                {totalParticipants > 0
                  ? `${Math.round((completedCount / totalParticipants) * 100)}%`
                  : "0%"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border border-border text-center">
              <span className="text-[11px] text-muted-foreground block">O‘rtacha ball</span>
              <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                {assignment.stats?.averageScore.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Qatnashuvchilar"
          value={`${totalParticipants} nafar`}
          icon={Users}
          subtitle="Guruhdagi o‘quvchilar"
          iconColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="Topshirdi"
          value={`${completedCount} nafar`}
          icon={CheckCircle2}
          subtitle="Testni yakunlaganlar"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <StatCard
          title="Jarayonda"
          value={`${inProgressCount} nafar`}
          icon={Clock}
          subtitle="Hozir ishlayotganlar"
          iconColorClass="text-amber-600 dark:text-amber-400"
          iconBgClass="bg-amber-50 dark:bg-amber-950/50"
        />
        <StatCard
          title="Boshlamagan"
          value={`${notStartedCount} nafar`}
          icon={AlertTriangle}
          subtitle="Hali kirmaganlar"
          iconColorClass="text-purple-600 dark:text-purple-400"
          iconBgClass="bg-purple-50 dark:bg-purple-950/50"
        />
      </div>

      {/* Tabs: Live Progress / Leaderboard and Questions */}
      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="grid grid-cols-2 max-w-sm">
          <TabsTrigger value="progress" className="text-xs font-semibold">
            Natijalar & Jarayon ({progressList.length})
          </TabsTrigger>
          <TabsTrigger value="questions" className="text-xs font-semibold">
            Savollar ({assignment.questions.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Live Progress & Leaderboard */}
        <TabsContent value="progress" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">
                    O‘quvchilarning Jonli Natijalari
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isFinalized
                      ? "Yakuniy ballar va o‘rinlar taqsimoti (Telegramga yuborilgan)"
                      : "Jarayon real vaqtda yangilanib turadi. O‘quvchilar test paytida boshqalar natijasini ko‘ra olmaydi."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {progressList.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Hali o‘quvchilar ro‘yxati shakllanmagan. Topshiriqni e'lon qiling.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {progressList.map((p, idx) => {
                    const isCompleted = p.status === "completed";
                    const isInProgress = p.status === "in_progress";

                    const medals = ["🥇", "🥈", "🥉"];
                    const medal = p.finalRank && p.finalRank <= 3 ? medals[p.finalRank - 1] : null;

                    return (
                      <div
                        key={p.studentId}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          isCompleted
                            ? "border-emerald-200 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10"
                            : isInProgress
                            ? "border-amber-200 dark:border-amber-950 bg-amber-50/20 dark:bg-amber-950/10"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {medal || `${idx + 1}`}
                          </div>

                          <div className="min-w-0">
                            <span className="font-bold text-sm text-foreground block truncate">
                              {p.displayName}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              {isCompleted ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Topshirdi • {p.correctCount}/{assignment.questions.length} to‘g‘ri
                                </span>
                              ) : isInProgress ? (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  Jarayonda ({p.currentPosition}/{assignment.questions.length}-savol)
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Boshlamagan</span>
                              )}

                              {p.firstPlaceCount > 0 && (
                                <span className="text-purple-600 font-medium">
                                  ⚡ {p.firstPlaceCount} ta 1-o‘rin tezlik
                                </span>
                              )}

                              {p.suspiciousEventCount > 0 && (
                                <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  {p.suspiciousEventCount} ta chiqish
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 justify-between sm:justify-end">
                          <div className="text-right">
                            {isCompleted ? (
                              <div>
                                <span className="font-mono font-bold text-sm text-foreground block">
                                  {p.finalScore > 0 ? p.finalScore.toLocaleString() : p.rawScore.toLocaleString()} ball
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  {p.completedAt ? formatDate(p.completedAt, "HH:mm:ss") : ""}
                                </span>
                              </div>
                            ) : isInProgress ? (
                              <span className="text-xs text-amber-600 font-medium">Ishlanmoqda...</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>

                          {(isCompleted || isInProgress) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStudentForReset(p);
                                setResetConfirmOpen(true);
                              }}
                              className="text-[11px] h-8 text-muted-foreground hover:text-rose-600"
                              title="O‘quvchiga qayta topshirish imkonini berish"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              <span>Tiklash</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Questions Inspection */}
        <TabsContent value="questions" className="space-y-4">
          <div className="space-y-3">
            {assignment.questions.map((q, idx) => {
              const letters = ["A", "B", "C", "D", "E", "F"];
              return (
                <Card key={q.id} className="p-4 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-sm text-foreground">
                        {q.question_text}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                          opt.is_correct
                            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold"
                            : "border-border bg-card text-foreground"
                        }`}
                      >
                        <span className="font-bold text-muted-foreground w-4 text-center">
                          {letters[optIdx]}
                        </span>
                        <span className="flex-1">{opt.option_text}</span>
                        {opt.is_correct && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Finalize Leaderboard Confirmation Modal */}
      <ConfirmDialog
        open={finalizeConfirmOpen}
        onOpenChange={setFinalizeConfirmOpen}
        title="Topshiriqni yakunlash va Natijalarni e'lon qilish"
        description="Topshiriq yakunlangach, barcha o‘quvchilarning o‘rinlari hisoblanadi va natijalar Telegram guruhiga bitta xabarda yuboriladi. Hali topshirmagan o‘quvchilar 'Topshirmadi' deb belgilanadi."
        confirmText="Ha, yakunlansin"
        cancelText="Bekor qilish"
        variant="default"
        loading={actionLoading}
        onConfirm={handleFinalize}
      />

      {/* Reset Attempt Confirmation Modal */}
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Attemptni qayta tiklashni tasdiqlaysizmi?"
        description={`"${selectedStudentForReset?.displayName}" ning ushbu topshiriqdagi barcha kiritgan javoblari va natijasi o‘chiriladi va o‘quvchi testni noldan qayta topshirishi mumkin bo‘ladi.`}
        confirmText="Ha, urinishni tiklash"
        cancelText="Bekor qilish"
        variant="destructive"
        loading={actionLoading}
        onConfirm={handleResetAttempt}
      />

      {/* Delete Assignment Modal */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Topshiriqni o‘chirishni tasdiqlaysizmi?"
        description="Ushbu qoralama topshiriq butunlay o‘chiriladi."
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        loading={actionLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
