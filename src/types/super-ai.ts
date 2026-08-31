export type RiskLevel = 0 | 1 | 2 | 3 | 4;

export interface ActionPreview {
  id: string;
  actionType: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  affectedEntities: {
    entityType: string;
    count: number;
    details: string[];
  }[];
  financialImpact?: {
    currentAmount: number;
    newAmount: number;
    currency: string;
    includeInRevenue: boolean;
  };
  steps: string[];
  payload: Record<string, any>;
  status: "pending" | "confirmed" | "cancelled" | "executed" | "failed";
  createdAt: string;
}

export interface AiAuditLog {
  id: string;
  userId: string;
  actionType: string;
  title: string;
  riskLevel: RiskLevel;
  beforeSnapshot: Record<string, any> | null;
  afterSnapshot: Record<string, any> | null;
  undoable: boolean;
  undone: boolean;
  executedAt: string;
}

export interface CrmAuditIssue {
  id: string;
  type: "duplicate_student" | "missing_phone" | "orphan_record" | "payment_mismatch" | "schedule_conflict" | "inactive_in_active_group";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  affectedEntityId: string;
  affectedEntityType: string;
  suggestedFix: string;
  autoFixAvailable: boolean;
  payload: Record<string, any>;
}

export interface Student360Report {
  student: {
    id: string;
    name: string;
    phone: string | null;
    parentName: string | null;
    parentPhone: string | null;
    status: string;
    joinedAt: string;
  };
  groups: { id: string; name: string; courseName: string; status: string }[];
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    rate: number;
  };
  paymentsStats: {
    totalPaid: number;
    lastPaymentDate: string | null;
    hasOverdue: boolean;
    daysOverdue: number;
    isFreeStudent: boolean;
  };
  academicStats: {
    averageGrade: number;
    homeworkCompletionRate: number;
    rankPoints: number;
  };
  riskAssessment: {
    level: "Low" | "Medium" | "High" | "Critical";
    reasons: string[];
  };
}
