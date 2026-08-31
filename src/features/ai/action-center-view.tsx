"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Play, CheckCircle2, XCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { ActionPreview } from "@/types/super-ai";
import { confirmAndExecuteAction } from "@/actions/super-ai-actions";
import { toast } from "sonner";

export function ActionCenterView() {
  const [pendingActions, setPendingActions] = useState<ActionPreview[]>([
    {
      id: "action-1",
      actionType: "group_transfer",
      title: "Ali Valiyevni 'Python-2' guruhiga ko'chirish",
      description: "O'quvchi 'Python-1' guruhidan chiqarilib, 'Python-2' guruhiga faol a'zo qilib biriktiriladi.",
      riskLevel: 2,
      requiresConfirmation: true,
      affectedEntities: [
        { entityType: "Student", count: 1, details: ["Ali Valiyev (ID: st-9482)"] },
        { entityType: "Group", count: 2, details: ["From: Python-1", "To: Python-2"] },
      ],
      steps: [
        "1. Current group membership status -> Chiqib ketgan",
        "2. Target group membership status -> Faol",
        "3. Billing schedule -> Next month Python-2 tariff",
      ],
      payload: { studentId: "st-9482", targetGroupId: "grp-py2" },
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  ]);

  const [executingId, setExecutingId] = useState<string | null>(null);

  const handleApprove = async (action: ActionPreview) => {
    setExecutingId(action.id);
    try {
      const res = await confirmAndExecuteAction(action);
      if (res.success) {
        toast.success(res.message);
        setPendingActions((prev) => prev.filter((a) => a.id !== action.id));
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Amalni bajarishda kutilmagan xatolik yuz berdi");
    } finally {
      setExecutingId(null);
    }
  };

  const handleCancel = (id: string) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== id));
    toast.info("Amal bekor qilindi");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-500" />
          AI Actions Center
        </h2>
        <p className="text-sm text-muted-foreground">
          AI tomonidan taklif qilingan va ijro uchun tasdiq kutayotgan barcha Dry-Run amallar.
        </p>
      </div>

      {pendingActions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <h3 className="font-semibold text-lg">Hozircha kutilayotgan amallar yo'q</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              AI Agent har qanday sezgir o'zgarishdan oldin (Level 2-4) bu yerga Dry-Run preview kartasini chiqaradi.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingActions.map((action) => (
            <Card key={action.id} className="border-l-4 border-l-amber-500 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
                        Risk Level {action.riskLevel}
                      </Badge>
                    </div>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                  <Badge variant="secondary">Tasdiq kutilmoqda</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-xl p-4 text-xs space-y-2 font-mono">
                  <div className="font-semibold text-foreground text-sm">Amal ketma-ketligi (Plan):</div>
                  {action.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                      <ArrowRight className="w-3 h-3 text-blue-500" />
                      {step}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(action.id)}
                    disabled={executingId === action.id}
                  >
                    <XCircle className="w-4 h-4 mr-1 text-rose-500" />
                    Bekor qilish
                  </Button>

                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleApprove(action)}
                    disabled={executingId === action.id}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {executingId === action.id ? "Bajarilmoqda..." : "Tasdiqlash & Bajarish"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
