"use client";

import { useState } from "react";
import {
  Sparkles,
  LayoutDashboard,
  MessageSquareText,
  Presentation,
  ShieldAlert,
  CreditCard,
  UserCheck,
  FileText,
  History,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatAgent } from "./chat-agent";
import { AiOverview } from "./ai-overview";
import { TeacherCopilot } from "./teacher-copilot";
import { ActionCenterView } from "./action-center-view";
import { CrmAuditTab } from "./crm-audit-tab";
import { AuditHistoryTab } from "./audit-history-tab";
import { PaymentIntelligenceTab } from "./payment-intelligence-tab";
import { StudentAnalysisTab } from "./student-analysis-tab";
import { ReportsTab } from "./reports-tab";
import { ProactiveInsightsTab } from "./proactive-insights-tab";

export function AiAgentView() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          Maktabcha Super Admin AI Agent
        </h1>
        <p className="text-muted-foreground text-sm">
          CRM ichidagi barcha ma'lumotlarni tahlil qiluvchi, o'zgartiruvchi va tabiiy tildagi buyruqlarni bajaruvchi AI boshqaruv markazi.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto scrollbar-none pb-2">
          <TabsList className="flex w-max space-x-1 p-1 bg-muted/60 rounded-xl">
            <TabsTrigger value="chat" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <MessageSquareText className="w-4 h-4 text-blue-500" />
              <span>AI Chat</span>
            </TabsTrigger>

            <TabsTrigger value="overview" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <LayoutDashboard className="w-4 h-4 text-indigo-500" />
              <span>Bugungi holat</span>
            </TabsTrigger>

            <TabsTrigger value="insights" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Tavsiya & Muammolar</span>
            </TabsTrigger>

            <TabsTrigger value="actions" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>AI Actions</span>
            </TabsTrigger>

            <TabsTrigger value="copilot" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <Presentation className="w-4 h-4 text-purple-500" />
              <span>Teacher Copilot</span>
            </TabsTrigger>

            <TabsTrigger value="payments" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>Payments</span>
            </TabsTrigger>

            <TabsTrigger value="students" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <UserCheck className="w-4 h-4 text-blue-500" />
              <span>Students 360</span>
            </TabsTrigger>

            <TabsTrigger value="reports" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <FileText className="w-4 h-4 text-cyan-500" />
              <span>Reports & Export</span>
            </TabsTrigger>

            <TabsTrigger value="audit" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>CRM Audit</span>
            </TabsTrigger>

            <TabsTrigger value="history" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <History className="w-4 h-4 text-slate-500" />
              <span>Activity History</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="mt-4">
          <ChatAgent />
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <AiOverview />
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <ProactiveInsightsTab />
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <ActionCenterView />
        </TabsContent>

        <TabsContent value="copilot" className="mt-4">
          <TeacherCopilot />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <PaymentIntelligenceTab />
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          <StudentAnalysisTab />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <ReportsTab />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <CrmAuditTab />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <AuditHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
