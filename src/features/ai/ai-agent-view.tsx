"use client";

import { useState } from "react";
import { Sparkles, LayoutDashboard, MessageSquareText, Presentation, FileSearch } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatAgent } from "./chat-agent";
import { AiOverview } from "./ai-overview";
import { TeacherCopilot } from "./teacher-copilot";

export function AiAgentView() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          AI Agent
        </h1>
        <p className="text-muted-foreground">
          O‘quv markazingizdagi holatni kuzatadi va keyingi eng muhim ishlarni tavsiya qiladi.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px] mb-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Umumiy holat</span>
          </TabsTrigger>
          <TabsTrigger value="copilot" className="flex items-center gap-2">
            <Presentation className="w-4 h-4" />
            <span className="hidden sm:inline">Teacher Copilot</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquareText className="w-4 h-4" />
            <span className="hidden sm:inline">AI Chat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <AiOverview />
        </TabsContent>

        <TabsContent value="copilot" className="mt-0">
          <TeacherCopilot />
        </TabsContent>

        <TabsContent value="chat" className="mt-0">
          <ChatAgent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
