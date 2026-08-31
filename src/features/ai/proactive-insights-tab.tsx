"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertCircle, ArrowRight, Sparkles, UserX, CalendarX } from "lucide-react";
import { toast } from "sonner";

export function ProactiveInsightsTab() {
  const alerts = [
    {
      id: "alt-1",
      title: "2 ta o'quvchining to'lovi 7 kundan ortiq kechikmoqda",
      type: "critical",
      category: "Payments",
      description: "Sardor Karimov va Malika Umarova to'lovi kechikkan. Telegram orqali avtomat eslatma yuborish tavsiya etiladi.",
      actionLabel: "Telegram Eslatmasi Yuborish",
    },
    {
      id: "alt-2",
      title: "Ertangi 'Python-1' darsi uchun o'quv reja tuzilmagan",
      type: "high",
      category: "Curriculum",
      description: "O'qituvchi hali dars rejasini kiritmadi. Teacher Copilot orqali dars rejasini avtomat shakllantirishingiz mumkin.",
      actionLabel: "Copilot bilan Reja Tuzish",
    },
    {
      id: "alt-3",
      title: "3 ta o'quvchi ma'lumotida telefon raqami yo'q",
      type: "medium",
      category: "Data Integrity",
      description: "O'quvchilar ro'yxatida bog'lanish uchun telefon raqami ko'rsatilmadi.",
      actionLabel: "CRM Auditga o'tish",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Proactive AI Alerts & Recommendations
        </h2>
        <p className="text-sm text-muted-foreground">
          AI Agent tomonidan aniqlangan dolzarb muammolar va ularni tezkor hal qilish tavsiyalari.
        </p>
      </div>

      <div className="grid gap-4">
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            className={
              alert.type === "critical"
                ? "border-l-4 border-l-rose-500"
                : alert.type === "high"
                ? "border-l-4 border-l-amber-500"
                : "border-l-4 border-l-blue-500"
            }
          >
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base">{alert.title}</span>
                  <Badge variant="outline">{alert.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
              </div>

              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                onClick={() => toast.success(`Amal bajarildi: ${alert.actionLabel}`)}
              >
                {alert.actionLabel}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
