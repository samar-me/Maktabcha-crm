"use server";

import { runCrmHealthAudit } from "@/lib/ai/crm-auditor";
import { generateFullCrmExport } from "@/lib/ai/crm-exporter";
import { getAiAuditLogs, undoAiAction, logAiAction } from "@/lib/ai/ai-audit";
import { ActionPreview, RiskLevel } from "@/types/super-ai";
import { createAdminClient } from "@/lib/supabase/admin";

export async function runCrmAuditServerAction() {
  try {
    return await runCrmHealthAudit();
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function exportFullDataServerAction() {
  try {
    return await generateFullCrmExport();
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getAiAuditLogsServerAction() {
  try {
    return await getAiAuditLogs();
  } catch (err: any) {
    return [];
  }
}

export async function undoAiActionServerAction(logId: string) {
  try {
    return await undoAiAction(logId);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function getStudent360ServerAction(studentNameOrId: string) {
  try {
    const { getStudent360Tool } = await import("@/lib/ai/super-agent-tools");
    // @ts-ignore
    return await getStudent360Tool.execute({ studentNameOrId });
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function executeDryRunAction(params: {
  actionType: string;
  title: string;
  payload: Record<string, any>;
}): Promise<ActionPreview> {
  let riskLevel: RiskLevel = 1;
  let description = "Amal tayyorlandi.";
  const affectedEntities: ActionPreview["affectedEntities"] = [];

  if (params.actionType.includes("delete") || params.actionType.includes("wipe")) {
    riskLevel = 4;
    description = "DIQQAT: Ma'lumotlarni batamom o'chirish amali. Zaxira yaratilishi tavsiya etiladi.";
  } else if (params.actionType.includes("archive") || params.actionType.includes("reset")) {
    riskLevel = 3;
    description = "Senzitiv amal: foydalanuvchi huquqlari yoki statusiga ta'sir o'tkazadi.";
  } else if (params.actionType.includes("transfer") || params.actionType.includes("scholarship")) {
    riskLevel = 2;
    description = "O'quvchi billing yoki guruh a'zoligi o'zgartiriladi.";
  }

  affectedEntities.push({
    entityType: params.payload.entityType || "Database Entity",
    count: params.payload.count || 1,
    details: [params.title],
  });

  return {
    id: `preview-${Date.now()}`,
    actionType: params.actionType,
    title: params.title,
    description,
    riskLevel,
    requiresConfirmation: riskLevel >= 2,
    affectedEntities,
    payload: params.payload,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

export async function confirmAndExecuteAction(preview: ActionPreview) {
  try {
    const supabase = createAdminClient();

    if (preview.actionType === "group_transfer") {
      const { studentId, targetGroupId } = preview.payload;
      await supabase.from("group_students").insert({
        student_id: studentId,
        group_id: targetGroupId,
        status: "Faol",
      });
    } else if (preview.actionType === "scholarship_exception") {
      const { studentId, notes } = preview.payload;
      await supabase.from("students").update({ notes }).eq("id", studentId);
    }

    await logAiAction({
      actionType: preview.actionType,
      title: preview.title,
      riskLevel: preview.riskLevel,
      beforeSnapshot: preview.payload,
    });

    return { success: true, message: `Amal muvaffaqiyatli bajarildi: ${preview.title}` };
  } catch (err: any) {
    return { success: false, message: `Amalni bajarishda xatolik: ${err.message}` };
  }
}
