"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CalendarClock, BookOpen, Presentation, Loader2 } from "lucide-react";
import { generateDashboardInsightsAction, AIInsight } from "@/actions/ai-insights";
import { toast } from "sonner";

export function AiOverview() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await generateDashboardInsightsAction();
        if (res.success && res.insights) {
          setInsights(res.insights);
        } else {
          toast.error(res.error || "Xatolik yuz berdi");
        }
      } catch (err) {
        toast.error("AI tahlilida xatolik");
      } finally {
        setIsLoading(false);
      }
    }
    fetchInsights();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "border-l-destructive bg-destructive/5 text-destructive";
      case "high": return "border-l-orange-500 bg-orange-500/5 text-orange-600";
      case "medium": return "border-l-yellow-500 bg-yellow-500/5 text-yellow-600";
      case "low": return "border-l-blue-500 bg-blue-500/5 text-blue-600";
      default: return "border-l-muted bg-muted/5";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-destructive/10 text-destructive";
      case "high": return "bg-orange-500/10 text-orange-600";
      case "medium": return "bg-yellow-500/10 text-yellow-600";
      case "low": return "bg-blue-500/10 text-blue-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Example static summary cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{insights.filter(i => i.priority === 'critical').length}</div>
          <p className="text-xs text-muted-foreground">Zudlik bilan hal qilinishi kerak</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">To'lovlar xavfi</CardTitle>
          <CalendarClock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{insights.filter(i => i.type === 'payment' || i.type === 'finance').length}</div>
          <p className="text-xs text-muted-foreground">To'lov bilan bog'liq</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">O'quvchilar xavfi</CardTitle>
          <BookOpen className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{insights.filter(i => i.type === 'student-risk' || i.type === 'attendance').length}</div>
          <p className="text-xs text-muted-foreground">O'zlashtirish va davomad</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Dars tavsiyalari</CardTitle>
          <Presentation className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{insights.filter(i => i.type === 'lesson' || i.type === 'curriculum').length}</div>
          <p className="text-xs text-muted-foreground">Teacher Copilot tavsiyalari</p>
        </CardContent>
      </Card>
      
      <div className="col-span-full mt-4">
        <h3 className="text-lg font-medium mb-4">Bugungi AI xulosasi</h3>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Ma'lumotlar bazasi tahlil qilinmoqda...</p>
          </div>
        ) : insights.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Hozircha hech qanday muammo yoki tavsiya topilmadi. Barchasi joyida!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {insights.map(insight => (
              <Card key={insight.id} className={`border-l-4 ${getPriorityColor(insight.priority)}`}>
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded font-semibold capitalize ${getPriorityBadge(insight.priority)}`}>
                      {insight.priority}
                    </span>
                    {insight.title}
                  </CardTitle>
                  <CardDescription className="text-foreground/80 pt-1">
                    {insight.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
