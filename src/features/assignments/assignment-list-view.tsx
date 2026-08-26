"use client";

import * as React from "react";
import Link from "next/link";
import { getGroups } from "@/services/groups";
import {
  getAssignmentsAction,
  publishAssignmentAction,
  deleteAssignmentAction,
  duplicateAssignmentAction,
} from "@/actions/assignments";
import { Group } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Target,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Send,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Trophy,
  HelpCircle,
  Loader2,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

export function AssignmentListView() {
  const [assignments, setAssignments] = React.useState<any[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = React.useState<any | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [assRes, grpList] = await Promise.all([
        getAssignmentsAction(),
        getGroups(),
      ]);
      setAssignments(assRes.data || []);
      setGroups(grpList);
    } catch {
      toast.error("Topshiriqlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(loadData);

  const handlePublish = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await publishAssignmentAction(id, true);
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

  const handleDuplicate = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await duplicateAssignmentAction(id);
      if (res.success) {
        toast.success("Topshiriqdan nusxa olindi");
        await loadData();
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
    if (!assignmentToDelete) return;
    setActionLoading(true);
    try {
      const res = await deleteAssignmentAction(assignmentToDelete.id);
      if (res.success) {
        toast.success("Topshiriq o‘chirildi");
        setDeleteConfirmOpen(false);
        await loadData();
      } else {
        toast.error(res.error || "O‘chirishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAssignments = React.useMemo(() => {
    return assignments.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.group_name.toLowerCase().includes(q);

      const matchesGroup = groupFilter === "all" || a.group_id === groupFilter;
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;

      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [assignments, searchQuery, groupFilter, statusFilter]);

  const activeCount = assignments.filter((a) => a.status === "Faol").length;
  const completedCount = assignments.filter((a) => a.status === "Yakunlangan").length;
  const totalSubmissions = assignments.reduce((sum, a) => sum + (a.completed_count || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Faol":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Faol
          </span>
        );
      case "Yakunlangan":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Yakunlangan
          </span>
        );
      case "Qoralama":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            Qoralama
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Topshiriqlar"
        description="O‘quvchilar uchun interaktiv testlar va Telegram Mini App platformasi"
      >
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5 h-9 text-xs font-semibold">
            <Link href="/assignments/new?mode=manual">
              <Plus className="w-4 h-4" />
              <span>Qo‘lda yaratish</span>
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="gap-1.5 h-9 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs"
          >
            <Link href="/assignments/new?mode=ai">
              <Sparkles className="w-4 h-4" />
              <span>✨ AI bilan yaratish</span>
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Jami topshiriqlar"
          value={assignments.length}
          icon={Target}
          subtitle="Barcha guruhlar bo‘yicha"
          iconColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="Faol testlar"
          value={activeCount}
          icon={Send}
          subtitle="Jarayondagi topshiriqlar"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <StatCard
          title="Yakunlangan"
          value={completedCount}
          icon={Trophy}
          subtitle="Natijalari hisoblangan"
          iconColorClass="text-purple-600 dark:text-purple-400"
          iconBgClass="bg-purple-50 dark:bg-purple-950/50"
        />
        <StatCard
          title="Jami urinishlar"
          value={totalSubmissions}
          icon={CheckCircle2}
          subtitle="Ishlangan test javoblari"
          iconColorClass="text-amber-600 dark:text-amber-400"
          iconBgClass="bg-amber-50 dark:bg-amber-950/50"
        />
      </div>

      {/* Filters Bar */}
      <Card className="p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Topshiriq yoki guruh nomi bo‘yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-base sm:text-sm h-10 sm:h-9"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="h-10 sm:h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium"
            >
              <option value="all">Barcha guruhlar</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 sm:h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium"
            >
              <option value="all">Barcha statuslar</option>
              <option value="Faol">Faol</option>
              <option value="Qoralama">Qoralama</option>
              <option value="Yakunlangan">Yakunlangan</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Assignments List */}
      {loading ? (
        <Card className="p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Topshiriqlar yuklanmoqda...</p>
        </Card>
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Topshiriqlar topilmadi"
          description={
            searchQuery || groupFilter !== "all" || statusFilter !== "all"
              ? "Qidiruv parametrlariga mos topshiriq mavjud emas."
              : "Guruhlaringiz uchun birinchi interaktiv test topshirig‘ini yarating va Telegram orqali yuboring."
          }
          actionLabel={searchQuery ? undefined : "Yangi topshiriq yaratish"}
          onAction={searchQuery ? undefined : () => (window.location.href = "/assignments/new")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assignment) => (
            <Card
              key={assignment.id}
              className="hover:shadow-md transition-shadow border border-border flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block truncate mb-1">
                      {assignment.group_name} {assignment.course_name ? `• ${assignment.course_name}` : ""}
                    </span>
                    <Link
                      href={`/assignments/${assignment.id}`}
                      className="font-bold text-base text-foreground hover:text-blue-600 transition-colors line-clamp-2"
                    >
                      {assignment.title}
                    </Link>
                  </div>
                  {getStatusBadge(assignment.status)}
                </div>

                {assignment.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {assignment.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-muted/40 border border-border/60 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Savollar</span>
                    <span className="font-bold text-foreground">{assignment.question_count} ta</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">O‘quvchilar</span>
                    <span className="font-bold text-foreground">{assignment.participant_count} nafar</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Topshirdi</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {assignment.completed_count} / {assignment.participant_count}
                    </span>
                  </div>
                </div>

                {/* Telegram info & date */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1 text-[11px] truncate">
                    {assignment.telegram_group_title ? (
                      <span className="text-sky-600 dark:text-sky-400 font-medium truncate flex items-center gap-1">
                        <Send className="w-3 h-3 shrink-0" />
                        {assignment.telegram_group_title}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Telegram ulanmagan</span>
                    )}
                  </span>

                  <span className="text-[11px] shrink-0">
                    {formatDate(assignment.created_at, "d-MMM, yyyy")}
                  </span>
                </div>

                {/* Actions bottom bar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <Button size="sm" variant="outline" asChild className="text-xs h-8 flex-1">
                    <Link href={`/assignments/${assignment.id}`}>
                      <Trophy className="w-3.5 h-3.5 mr-1" />
                      <span>Natijalar</span>
                    </Link>
                  </Button>

                  {assignment.status === "Qoralama" && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(assignment.id)}
                      disabled={actionLoading}
                      className="text-xs h-8 gap-1 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>E'lon qilish</span>
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link href={`/assignments/${assignment.id}`}>
                          <Trophy className="w-4 h-4 mr-2" />
                          <span>Ko‘rish & Jarayon</span>
                        </Link>
                      </DropdownMenuItem>

                      {assignment.status === "Qoralama" && (
                        <DropdownMenuItem asChild>
                          <Link href={`/assignments/${assignment.id}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            <span>Tahrirlash</span>
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem onClick={() => handleDuplicate(assignment.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        <span>Nusxa olish</span>
                      </DropdownMenuItem>

                      {assignment.status === "Qoralama" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setAssignmentToDelete(assignment);
                              setDeleteConfirmOpen(true);
                            }}
                            className="text-rose-600 dark:text-rose-400 focus:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            <span>O‘chirish</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Topshiriqni o‘chirishni tasdiqlaysizmi?"
        description={`"${assignmentToDelete?.title}" topshirig‘i va uning barcha savollari butunlay o‘chiriladi.`}
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        loading={actionLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
