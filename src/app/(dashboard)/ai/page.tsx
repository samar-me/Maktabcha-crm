import { Metadata } from "next";
import { AiAgentView } from "@/features/ai/ai-agent-view";

export const metadata: Metadata = {
  title: "AI Agent — Maktabcha CRM",
  description: "Markaz holatini avtomatik tahlil qilib, eng muhim ishlarni tavsiya qiluvchi AI yordamchi.",
};

export default function AiAgentPage() {
  return <AiAgentView />;
}
