"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Group } from "@/types/database";
import { calculateMonthlyWinnerAction } from "@/actions/discounts";
import { toast } from "sonner";
import { Loader2, Trophy } from "lucide-react";

interface MonthlyWinnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Group[];
}

export function MonthlyWinnerDialog({ open, onOpenChange, groups }: MonthlyWinnerDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [groupId, setGroupId] = React.useState(groups[0]?.id || "");
  const [month, setMonth] = React.useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = React.useState(new Date().getFullYear().toString());

  const handleCalculate = async () => {
    if (!groupId) {
      toast.error("Guruhni tanlang");
      return;
    }
    setLoading(true);
    try {
      const res = await calculateMonthlyWinnerAction(groupId, Number(month), Number(year));
      if (res.success) {
        toast.success(`G'olib aniqlandi! ${res.maxScore} ball bilan 20% chegirma berildi.`);
        onOpenChange(false);
      } else {
        toast.error(res.error || "G'olibni aniqlashda xatolik");
      }
    } catch (e: any) {
      toast.error("Kutilmagan xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const months = [
    { value: "1", label: "Yanvar" },
    { value: "2", label: "Fevral" },
    { value: "3", label: "Mart" },
    { value: "4", label: "Aprel" },
    { value: "5", label: "May" },
    { value: "6", label: "Iyun" },
    { value: "7", label: "Iyul" },
    { value: "8", label: "Avgust" },
    { value: "9", label: "Sentabr" },
    { value: "10", label: "Oktabr" },
    { value: "11", label: "Noyabr" },
    { value: "12", label: "Dekabr" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <Trophy className="w-5 h-5" />
            Oy g'olibini aniqlash
          </DialogTitle>
          <DialogDescription>
            Ushbu guruhda ko'rsatilgan oy davomida eng ko'p ball (testlardan) yig'gan o'quvchiga avtomatik 20% chegirma taqdim etiladi.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Guruh</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Guruhni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Oy</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Yil</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bekor qilish</Button>
          <Button onClick={handleCalculate} disabled={loading} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            G'olibni aniqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
