"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { AiAuditLog } from "@/types/super-ai";
import { getAiAuditLogsServerAction, undoAiActionServerAction } from "@/actions/super-ai-actions";
import { toast } from "sonner";

export function AuditHistoryTab() {
  const [logs, setLogs] = useState<AiAuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAiAuditLogsServerAction();
      setLogs(data);
    } catch {
      toast.error("Tarixni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleUndo = async (logId: string) => {
    try {
      const res = await undoAiActionServerAction(logId);
      if (res.success) {
        toast.success(res.message);
        fetchLogs();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Bekor qilishda xatolik");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            AI Activity History & Reversible Undo
          </h2>
          <p className="text-sm text-muted-foreground">
            AI Agent tomonidan bajarilgan barcha amallar jurnali va ularni bekor qilish (Undo) imkoniyati.
          </p>
        </div>

        <Button onClick={fetchLogs} size="sm" variant="outline" disabled={loading}>
          <Clock className="w-4 h-4 mr-1.5" />
          Yangilash
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck className="w-12 h-12 text-blue-500 mb-3" />
            <h3 className="font-semibold text-lg">Hozircha bajarilgan AI amallari jurnali bo'sh</h3>
            <p className="text-sm text-muted-foreground mt-1">
              AI Agent tomonidan har bir o'zgartirish (guruh ko'chirish, billing exception, status yangilash) shu yerga yozib boriladi.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className={log.undone ? "opacity-60 bg-muted/30" : "bg-card"}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">{log.title}</span>
                    <Badge variant="outline">Risk Level {log.riskLevel}</Badge>
                    {log.undone && <Badge variant="secondary">BEKOR QILINGAN</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Bajaruvchi: {log.userId}</span>
                    <span>•</span>
                    <span>{new Date(log.executedAt).toLocaleString()}</span>
                  </div>
                </div>

                {log.undoable && !log.undone && (
                  <Button size="sm" variant="outline" onClick={() => handleUndo(log.id)}>
                    <RotateCcw className="w-4 h-4 mr-1.5 text-amber-500" />
                    Undo (Bekor qilish)
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
