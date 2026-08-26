"use client";

import * as React from "react";
import { Group } from "@/types/database";
import { AIAssignmentGeneratorView } from "./ai-assignment-generator-view";
import { AssignmentBuilder } from "./assignment-builder";

interface NewAssignmentPageViewProps {
  groups: Group[];
  initialMode?: "ai" | "manual";
  initialLessonId?: string;
  initialGroupId?: string;
}

export function NewAssignmentPageView({
  groups,
  initialMode = "ai",
  initialLessonId,
  initialGroupId,
}: NewAssignmentPageViewProps) {
  const [mode, setMode] = React.useState<"ai" | "manual">(initialMode);

  if (mode === "ai") {
    return (
      <AIAssignmentGeneratorView
        groups={groups}
        initialLessonId={initialLessonId}
        initialGroupId={initialGroupId}
        onSwitchToManual={() => setMode("manual")}
      />
    );
  }

  return (
    <AssignmentBuilder
      groups={groups}
      onSwitchToAI={() => setMode("ai")}
    />
  );
}
