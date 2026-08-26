"use client";

import * as React from "react";
import { Student } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Check } from "lucide-react";

interface AddStudentToGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableStudents: Student[];
  onAddStudent: (studentId: string) => void;
}

export function AddStudentToGroupDialog({
  open,
  onOpenChange,
  availableStudents,
  onAddStudent,
}: AddStudentToGroupDialogProps) {
  const [search, setSearch] = React.useState("");

  const filtered = availableStudents.filter((st) => {
    const q = search.toLowerCase();
    return (
      st.first_name.toLowerCase().includes(q) ||
      (st.last_name && st.last_name.toLowerCase().includes(q)) ||
      (st.phone && st.phone.includes(q))
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Guruhga o‘quvchi qo‘shish</DialogTitle>
          <DialogDescription className="text-xs">
            Ro‘yxatdan o‘quvchini tanlang va guruhga biriktiring
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="O‘quvchi ismi yoki telefoni bo‘yicha qidirish..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/60">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Qo‘shish uchun mos o‘quvchi topilmadi yoki barchasi ushbu guruhga a'zo.
              </p>
            ) : (
              filtered.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2.5 hover:bg-muted/40 rounded-lg transition-colors pt-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                      {st.first_name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {st.first_name} {st.last_name || ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {st.phone || "Telefon yo‘q"}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      onAddStudent(st.id);
                      onOpenChange(false);
                    }}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Qo‘shish</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
