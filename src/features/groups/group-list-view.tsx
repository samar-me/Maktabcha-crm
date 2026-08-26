"use client";

import * as React from "react";
import Link from "next/link";
import { Group, GroupStudent, ScheduleItem } from "@/types/database";
import { getGroups, createGroup, updateGroup, deleteGroup, getGroupStudents } from "@/services/groups";
import { GroupFormDialog } from "./group-form-dialog";
import { GroupFormValues } from "./group-schema";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
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
  Plus,
  Search,
  UsersRound,
  Users,
  Clock,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export function GroupListView() {
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [enrollments, setEnrollments] = React.useState<GroupStudent[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<Group | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [groupToDelete, setGroupToDelete] = React.useState<Group | null>(null);

  const loadGroups = React.useCallback(async () => {
    try {
      setLoading(true);
      const [grList, enrList] = await Promise.all([
        getGroups(),
        getGroupStudents(),
      ]);
      setGroups(grList);
      setEnrollments(enrList);
    } catch {
      toast.error("Guruhlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Group student counts map
  const groupStudentCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const enr of enrollments) {
      if (enr.status === "Faol") {
        map.set(enr.group_id, (map.get(enr.group_id) || 0) + 1);
      }
    }
    return map;
  }, [enrollments]);

  const filteredGroups = React.useMemo(() => {
    return groups.filter((g) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.course_name.toLowerCase().includes(q) ||
        g.teacher_name.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || g.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [groups, searchQuery, statusFilter]);

  const handleSaveGroup = async (values: GroupFormValues, id?: string) => {
    try {
      if (id) {
        await updateGroup(id, {
          name: values.name,
          course_name: values.course_name,
          teacher_name: values.teacher_name,
          monthly_fee: values.monthly_fee,
          room: values.room || null,
          start_date: values.start_date,
          status: values.status,
          schedule: values.schedule,
        });
        toast.success("Guruh ma'lumotlari yangilandi");
      } else {
        await createGroup({
          name: values.name,
          course_name: values.course_name,
          teacher_name: values.teacher_name,
          monthly_fee: values.monthly_fee,
          room: values.room || null,
          start_date: values.start_date,
          status: values.status,
          schedule: values.schedule,
        });
        toast.success("Yangi guruh muvaffaqiyatli ochildi");
      }

      await loadGroups();
    } catch {
      toast.error("Guruhni saqlashda xatolik yuz berdi");
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await deleteGroup(groupToDelete.id);
      toast.success("Guruh tizimdan o‘chirildi");
      setDeleteConfirmOpen(false);
      setGroupToDelete(null);
      await loadGroups();
    } catch {
      toast.error("O‘chirishda xatolik yuz berdi");
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar: Search, Status Filter & Add Button */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Guruh nomi, kurs yoki o‘qituvchi bo‘yicha qidirish..."
              className="pl-9 text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Guruh holati bo‘yicha filtrlash"
            className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Barcha guruhlar</option>
            <option value="Faol">Faol</option>
            <option value="Rejalashtirilgan">Rejalashtirilgan</option>
            <option value="Yopilgan">Yopilgan</option>
          </select>
        </div>

        <Button
          onClick={() => {
            setEditingGroup(null);
            setFormDialogOpen(true);
          }}
          className="gap-2 shrink-0"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi guruh ochish</span>
        </Button>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground px-1">
        Jami: <strong className="text-foreground">{filteredGroups.length}</strong> ta guruh topildi
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs">Guruhlar yuklanmoqda...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Guruhlar topilmadi"
          description={
            searchQuery || statusFilter !== "all"
              ? "Qidiruv so‘rovi yoki filtr bo‘yicha guruh topilmadi."
              : "Hozircha birorta ham guruh ochilmagan. Birinchi guruhni oching."
          }
          actionLabel={searchQuery ? "Qidiruvni tozalash" : "Yangi guruh ochish"}
          onAction={() => {
            if (searchQuery || statusFilter !== "all") {
              setSearchQuery("");
              setStatusFilter("all");
            } else {
              setEditingGroup(null);
              setFormDialogOpen(true);
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((grp) => {
            const studentCount = groupStudentCounts.get(grp.id) || 0;
            const scheduleList = Array.isArray(grp.schedule)
              ? (grp.schedule as ScheduleItem[])
              : [];

            return (
              <Card
                key={grp.id}
                className="shadow-sm hover:shadow-md transition-all border-border/80 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={grp.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Amallar</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={`/groups/${grp.id}`} className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span>Tafsilotlar</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingGroup(grp);
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
                            setGroupToDelete(grp);
                            setDeleteConfirmOpen(true);
                          }}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          <span>O‘chirish</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Link href={`/groups/${grp.id}`} className="group">
                    <CardTitle className="text-lg font-bold group-hover:text-blue-600 transition-colors">
                      {grp.name}
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5 line-clamp-1">
                      {grp.course_name}
                    </CardDescription>
                  </Link>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="p-3 rounded-xl bg-muted/40 text-xs space-y-2 border border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        O‘qituvchi:
                      </span>
                      <span className="font-semibold text-foreground">{grp.teacher_name}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <UsersRound className="w-3.5 h-3.5" />
                        O‘quvchilar:
                      </span>
                      <span className="font-bold text-foreground">{studentCount} nafar</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Xona:
                      </span>
                      <span className="font-medium text-foreground">{grp.room || "Belgilanmagan"}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <span className="text-muted-foreground">Oylik to‘lov:</span>
                      <MoneyDisplay amount={grp.monthly_fee} size="sm" variant="positive" />
                    </div>
                  </div>

                  {/* Schedule Badges */}
                  {scheduleList.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground font-medium block">Dars jadvali:</span>
                      <div className="flex flex-wrap gap-1">
                        {scheduleList.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60"
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {item.day.slice(0, 4)}: {item.start_time}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full text-xs h-8" size="sm">
                      <Link href={`/groups/${grp.id}`}>
                        <span>Guruhni ko‘rish & O‘quvchilar</span>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Group Dialog */}
      <GroupFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        group={editingGroup}
        onSave={handleSaveGroup}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Guruhni o‘chirishni tasdiqlaysizmi?"
        description={`"${groupToDelete?.name}" guruhi tizimdan butunlay o‘chiriladi. Guruhga biriktirilgan o‘quvchilar saqlanib qoladi.`}
        confirmText="Ha, o‘chirilsin"
        cancelText="Bekor qilish"
        variant="destructive"
        onConfirm={handleDeleteGroup}
      />
    </div>
  );
}
