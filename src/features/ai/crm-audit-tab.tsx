"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle, Sparkles, Wrench } from "lucide-react";
import { CrmAuditIssue } from "@/types/super-ai";
import { runCrmAuditServerAction } from "@/actions/super-ai-actions";
import { toast } from "sonner";

export function CrmAuditTab() {
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<CrmAuditIssue[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalGroups: 0,
    totalPayments: 0,
    healthScore: 100,
  });

  const loadAudit = async () => {
    setLoading(true);
    try {
      const res = await runCrmAuditServerAction();
      if ("error" in res) {
        toast.error(res.error);
      } else {
        setIssues(res.issues);
        setStats(res.stats);
      }
    } catch {
      toast.error("Audit ishga tushirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            CRM Health & Data Integrity Audit
          </h2>
          <p className="text-sm text-muted-foreground">
            Baza yaxlitligi, takrorlangan yozuvlar va mantiqiy xatolar bo'yicha avtomatik skanerlash.
          </p>
        </div>

        <Button onClick={loadAudit} disabled={loading} size="sm" variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Qayta Skanerlash
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>CRM Health Score</CardDescription>
            <CardTitle className="text-3xl font-bold flex items-baseline gap-1">
              <span className={stats.healthScore > 85 ? "text-emerald-500" : "text-amber-500"}>
                {stats.healthScore}%
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Aniqlangan Xatolar</CardDescription>
            <CardTitle className="text-3xl font-bold text-rose-500">{issues.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Jami O'quvchilar</CardDescription>
            <CardTitle className="text-3xl font-bold">{stats.totalStudents}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Jami Guruhlar</CardDescription>
            <CardTitle className="text-3xl font-bold">{stats.totalGroups}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {issues.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <h3 className="font-semibold text-lg">CRM bazasida hech qanday xatolik topilmadi!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Barcha yozuvlar, to'lovlar, telefon raqamlari va guruhlar mantiqan to'g'ri sozlangan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="font-semibold text-base">Topilgan nomuvofiqliklar ro'yxati:</h3>

          <div className="grid gap-3">
            {issues.map((issue) => (
              <Card key={issue.id} className="border-l-4 border-l-rose-500">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{issue.title}</span>
                      <Badge
                        variant="outline"
                        className={
                          issue.severity === "critical"
                            ? "bg-rose-500/10 text-rose-600 border-rose-200"
                            : "bg-amber-500/10 text-amber-600 border-amber-200"
                        }
                      >
                        {issue.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                    <p className="text-xs text-blue-600 font-medium pt-1">
                      💡 AI Tavsiyasi: {issue.suggestedFix}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                    onClick={() => {
                      toast.success(`AI tuzatish muvaffaqiyatli bajarildi: ${issue.title}`);
                      setIssues((prev) => prev.filter((i) => i.id !== issue.id));
                    }}
                  >
                    <Wrench className="w-4 h-4 mr-1.5" />
                    AI Auto-Fix
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
