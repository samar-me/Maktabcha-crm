"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Search, ShieldAlert, GraduationCap, Calendar, CreditCard, Activity } from "lucide-react";
import { getStudent360ServerAction } from "@/actions/super-ai-actions";
import { toast } from "sonner";

export function StudentAnalysisTab() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await getStudent360ServerAction(query);
      if (res.error) {
        toast.error(res.error);
        setReport(null);
      } else {
        setReport(res);
      }
    } catch {
      toast.error("Qidiruvda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-500" />
          Student 360 & Risk Assessment
        </h2>
        <p className="text-sm text-muted-foreground">
          O'quvchining davomati, to'lovlari, o'zlashtirishi va xavf omillarini chuqur tahlil qilish.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="O'quvchi ismi yoki telefonini kiriting (masalan: Ali)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-md"
        />
        <Button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Search className="w-4 h-4 mr-1.5" />
          {loading ? "Tahlil qilinmoqda..." : "360 Tahlil"}
        </Button>
      </div>

      {report && report.student && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{report.student.fullName}</CardTitle>
                  <CardDescription>
                    Tel: {report.student.phone || "Kiritilmagan"} | Ota-onasi: {report.student.parentPhone || "Kiritilmagan"}
                  </CardDescription>
                </div>
                <Badge
                  className={
                    report.riskAssessment.level === "High"
                      ? "bg-rose-500"
                      : report.riskAssessment.level === "Medium"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }
                >
                  Risk: {report.riskAssessment.level}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-muted/40 p-3 rounded-xl space-y-1">
                  <div className="text-xs text-muted-foreground">Davomat ko'rsatgichi</div>
                  <div className="text-xl font-bold text-blue-600">{report.attendance.rate}%</div>
                  <div className="text-xs text-muted-foreground">{report.attendance.present} / {report.attendance.total} darsda qatnashgan</div>
                </div>

                <div className="bg-muted/40 p-3 rounded-xl space-y-1">
                  <div className="text-xs text-muted-foreground">To'lov intizomi</div>
                  <div className="text-xl font-bold text-emerald-600">
                    {report.payments.daysOverdue > 0 ? `${report.payments.daysOverdue} kun kechikmoqda` : "To'langan"}
                  </div>
                  <div className="text-xs text-muted-foreground">So'nggi to'lov: {report.payments.lastPaymentDate || "Yo'q"}</div>
                </div>

                <div className="bg-muted/40 p-3 rounded-xl space-y-1">
                  <div className="text-xs text-muted-foreground">O'rtacha o'zlashtirish</div>
                  <div className="text-xl font-bold text-purple-600">{Math.round(report.grades.avgScore || 0)} ball</div>
                  <div className="text-xs text-muted-foreground">{report.grades.totalGrades} ta baho kiritilgan</div>
                </div>
              </div>

              {report.riskAssessment.reasons.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-sm">
                    <ShieldAlert className="w-4 h-4" /> Aniqlangan Xavf Omili:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {report.riskAssessment.reasons.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
