import { createAdminClient } from "@/lib/supabase/admin";
import { AiAuditLog, RiskLevel } from "@/types/super-ai";

/**
 * In-memory / Supabase backed Audit Logger & Undo engine
 */
const inMemoryLogs: AiAuditLog[] = [];

export async function logAiAction(params: {
  userId?: string;
  actionType: string;
  title: string;
  riskLevel: RiskLevel;
  beforeSnapshot?: Record<string, any> | null;
  afterSnapshot?: Record<string, any> | null;
  undoable?: boolean;
}): Promise<AiAuditLog> {
  const log: AiAuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    userId: params.userId || "admin",
    actionType: params.actionType,
    title: params.title,
    riskLevel: params.riskLevel,
    beforeSnapshot: params.beforeSnapshot || null,
    afterSnapshot: params.afterSnapshot || null,
    undoable: params.undoable ?? true,
    undone: false,
    executedAt: new Date().toISOString(),
  };

  inMemoryLogs.unshift(log);
  return log;
}

export async function getAiAuditLogs(): Promise<AiAuditLog[]> {
  return inMemoryLogs;
}

export async function undoAiAction(logId: string): Promise<{ success: boolean; message: string }> {
  const log = inMemoryLogs.find((l) => l.id === logId);
  if (!log) {
    return { success: false, message: "Audit log topilmadi" };
  }

  if (!log.undoable) {
    return { success: false, message: "Ushbu amalni bekor qilib bo'lmaydi" };
  }

  if (log.undone) {
    return { success: false, message: "Ushbu amal allaqachon bekor qilingan" };
  }

  const supabase = createAdminClient();

  try {
    if (log.beforeSnapshot) {
      const { entityType, data } = log.beforeSnapshot;
      if (entityType && data && data.id) {
        await supabase.from(entityType).upsert(data);
      }
    }
    log.undone = true;
    return { success: true, message: `Amal muvaffaqiyatli bekor qilindi: ${log.title}` };
  } catch (err: any) {
    return { success: false, message: `Bekor qilishda xatolik: ${err.message}` };
  }
}
