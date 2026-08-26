"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Group } from "@/types/database";
import { Curriculum, CurriculumStatus } from "@/types/curriculum";
import {
  getCurriculaAction,
  deleteCurriculumAction,
  duplicateCurriculumAction,
} from "@/actions/curriculum";
import { generateCurriculumExcelTemplate } from "@/lib/curriculum-import";
import { CurriculumFormDialog } from "./curriculum-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
  BookOpen,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Layers,
  ArrowRight,
  Download,
  Percent,
} from "lucide-react";
import { toast } from "sonner";

interface CurriculumListViewProps {
  initialCurricula: Curriculum[];
  groups: Group[];
}

export function CurriculumListView({
  initialCurricula,
  groups,
}: CurriculumListViewProps) {
  const router = useRouter();
  const [curricula, setCurricula] = React.useState<Curriculum[]>(initialCurricula);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("Faol");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");

  // Create/Edit Dialog
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingCurriculum, setEditingCurriculum] = React.useState<Curriculum | null>(null);

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [targetDeleteId, setTargetDeleteId] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Duplicate Dialog
  const [targetDuplicate, setTargetDuplicate] = React.useState<Curriculum | null>(null);
  const [duplicateLoading, setDuplicateLoading] = React.useState(false);

  // Refresh list
  const refreshList = async () => {
    const res = await getCurriculaAction();
    if (res.success && res.data) {
      setCurricula(res.data);
    }
  };

  // Filtered list
  const filtered = React.useMemo(() => {
    return curricula.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (groupFilter !== "all") {
        if (groupFilter === "general" && c.group_id) return false;
        if (groupFilter !== "general" && c.group_id !== groupFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCourse = c.course_name.toLowerCase().includes(q);
        const matchGroup = c.groups?.name.toLowerCase().includes(q);
        if (!matchName && !matchCourse && !matchGroup) return false;
      }
      return true;
    });
  }, [curricula, statusFilter, groupFilter, search]);

  // Overall statistics
  const totalTopics = curricula.reduce((acc, c) => acc + (c.items_count || 0), 0);
  const totalCompleted = curricula.reduce((acc, c) => acc + (c.completed_count || 0), 0);
  const avgProgress =
    totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

  // Handle Download Excel Template
  const handleDownloadTemplate = () => {
    try {
      const data = generateCurriculumExcelTemplate();
      const blob = new Blob([data.buffer as any], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ish-reja-namuna.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel namuna fayli yuklab olindi");
    } catch {
      toast.error("Namuna yuklab olishda xatolik");
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!targetDeleteId) return;
    setDeleteLoading(true);
    try {
      const res = await deleteCurriculumAction(targetDeleteId);
      if (res.success) {
        toast.success("Ish reja o‘chirildi");
        setCurricula(curricula.filter((c) => c.id !== targetDeleteId));
        setDeleteDialogOpen(false);
      } else {
        toast.error(res.error || "O‘chirishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Duplicate
  const handleDuplicate = async (curr: Curriculum) => {
    setDuplicateLoading(true);
    try {
      const res = await duplicateCurriculumAction(curr.id);
      if (res.success && res.id) {
        toast.success("Ish rejadan nusxa olindi!");
        await refreshList();
        router.push(`/curriculum/${res.id}`);
      } else {
        toast.error(res.error || "Nusxa olishda xatolik");
      }
    } catch {
      toast.error("Kutilmagan xatolik");
    } finally {
      setDuplicateLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Ish reja / O‘quv dasturi"
        description="Rejalashtirilgan mavzular, darslar, amaliyot va testlar tizimi"
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="gap-1.5 h-9 text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Excel namuna</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingCurriculum(null);
              setFormOpen(true);
            }}
            className="gap-1.5 h-9 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi ish reja</span>
          </Button>
        </div>
      </PageHeader>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Jami ish rejalar"
          value={curricula.length}
          icon={BookOpen}
          subtitle="O‘quv dasturlari"
          iconColorClass="text-blue-600 dark:text-blue-400"
          iconBgClass="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="Rejalashtirilgan mavzular"
          value={totalTopics}
          icon={Layers}
          subtitle="Barcha mavzular"
          iconColorClass="text-purple-600 dark:text-purple-400"
          iconBgClass="bg-purple-50 dark:bg-purple-950/50"
        />
        <StatCard
          title="O‘tilgan darslar"
          value={totalCompleted}
          icon={CheckCircle2}
          subtitle="Bajarilgan reja"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <StatCard
          title="Umumiy o‘zlashtirish"
          value={`${avgProgress}%`}
          icon={Percent}
          subtitle="O‘rtacha progress"
          iconColorClass="text-sky-600 dark:text-sky-400"
          iconBgClass="bg-sky-50 dark:bg-sky-950/50"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Ish reja yoki kurs nomi bo‘yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Group Filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium"
          >
            <option value="all">Barcha guruhlar</option>
            <option value="general">Umumiy dasturlar</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Status Filter Tabs */}
          <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter("Faol")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "Faol"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Faol
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Arxivlangan")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "Arxivlangan"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Arxiv
            </button>
          </div>
        </div>
      </div>

      {/* Curricula Cards Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Ish reja topilmadi"
          description={
            search
              ? "Qidiruv bo‘yicha hech qanday ish reja topilmadi"
              : "Yangi ish reja yarating yoki Excel orqali mavzularni yuklang"
          }
          actionLabel="Yangi ish reja yaratish"
          onAction={() => {
            setEditingCurriculum(null);
            setFormOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((curr) => {
            const total = curr.items_count || 0;
            const completed = curr.completed_count || 0;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <Card
                key={curr.id}
                className="group hover:border-blue-500/50 transition-all shadow-xs flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                          {curr.course_name}
                        </span>
                        {curr.groups ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {curr.groups.name}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                            Umumiy dastur
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-foreground group-hover:text-blue-600 transition-colors line-clamp-1">
                        <Link href={`/curriculum/${curr.id}`}>{curr.name}</Link>
                      </h3>
                      {curr.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {curr.description}
                        </p>
                      )}
                    </div>

                    {/* Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={`/curriculum/${curr.id}`} className="gap-2 text-xs">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Mavzularni ko‘rish</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleDuplicate(curr)}
                          className="gap-2 text-xs"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Nusxa olish</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setEditingCurriculum(curr);
                            setFormOpen(true);
                          }}
                          className="gap-2 text-xs"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Tahrirlash</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => {
                            setTargetDeleteId(curr.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="gap-2 text-xs text-rose-600 focus:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>O‘chirish</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">
                        {completed} / {total} mavzu o‘tildi
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {progress}%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Open Button */}
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-9 justify-between group/btn hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300"
                  >
                    <Link href={`/curriculum/${curr.id}`}>
                      <span>Rejani ochish</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <CurriculumFormDialog
        groups={groups}
        initialData={editingCurriculum}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={async (newId) => {
          await refreshList();
          if (newId && !editingCurriculum) {
            router.push(`/curriculum/${newId}`);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Ish rejani o‘chirishni tasdiqlaysizmi?"
        description="Ushbu ish reja va unga tegishli barcha rejalashtirilgan mavzular o‘chiriladi. (O‘tilgan darslar saqlanib qoladi)."
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
