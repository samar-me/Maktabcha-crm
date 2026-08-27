"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, AlertTriangle, BookOpen, Loader2 } from "lucide-react";
import { generateLessonPlanAction } from "@/actions/ai-teacher";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function TeacherCopilot() {
  const [groups, setGroups] = useState<{id: string, name: string}[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    async function fetchGroups() {
      const supabase = createClient();
      const { data } = await supabase.from("groups").select("id, name").eq("status", "Faol");
      if (data) setGroups(data);
    }
    fetchGroups();
  }, []);

  const handleGenerate = async () => {
    if (!selectedGroup) {
      toast.error("Iltimos, guruhni tanlang");
      return;
    }
    setIsLoading(true);
    setPlan(null);
    try {
      const res = await generateLessonPlanAction(selectedGroup);
      if (res.success && res.plan) {
        setPlan(res.plan);
      } else {
        toast.error(res.error || "Xatolik yuz berdi");
      }
    } catch (err) {
      toast.error("Reja tuzishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Guruhni tanlash</CardTitle>
          <CardDescription>
            Qaysi guruh uchun dars rejasi kerak?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <select 
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="">-- Tanlang --</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <Button onClick={handleGenerate} disabled={isLoading || !selectedGroup} className="w-full">
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            AI Reja yaratish
          </Button>
        </CardContent>
      </Card>

      <div className="md:col-span-2 space-y-6">
        {!plan && !isLoading && (
          <Card className="border-dashed bg-muted/20 flex flex-col items-center justify-center p-12 text-center h-[300px]">
            <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Chap tomondan guruhni tanlab reja yarating</p>
          </Card>
        )}

        {isLoading && (
          <Card className="flex flex-col items-center justify-center p-12 text-center h-[300px]">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse">Ma'lumotlar o'rganilib, reja tuzilmoqda...</p>
          </Card>
        )}

        {plan && (
          <>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-primary">{plan.topic}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> {plan.duration} daqiqa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="font-medium mb-3 text-sm uppercase tracking-wider text-muted-foreground">Vaqt taqsimoti</h4>
                <div className="space-y-3">
                  {plan.breakdown.map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 items-center">
                      <div className="w-16 text-right text-sm font-bold text-primary bg-primary/10 py-1 px-2 rounded">
                        {item.minutes} m
                      </div>
                      <div className="text-sm">{item.activity}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                    <BookOpen className="w-5 h-5" />
                    O'qituvchiga tavsiyalar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-4 space-y-2 text-sm text-blue-900">
                    {plan.teacherPrep.map((prep: string, i: number) => (
                      <li key={i}>{prep}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {plan.knowledgeGaps && plan.knowledgeGaps.length > 0 && (
                <Card className="bg-orange-500/5 border-orange-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                      <AlertTriangle className="w-5 h-5" />
                      Qiyin bo'lishi mumkin
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-4 space-y-2 text-sm text-orange-900">
                      {plan.knowledgeGaps.map((gap: string, i: number) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
