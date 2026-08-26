import { z } from "zod";

// ============================================================================
// STATUS TYPES
// ============================================================================

export type CurriculumStatus = "Faol" | "Arxivlangan";

export type CurriculumItemStatus =
  | "Rejalashtirilgan"
  | "O‘tilgan"
  | "O‘tkazib yuborilgan"
  | "Ko‘chirilgan";

// ============================================================================
// CURRICULUM INTERFACES
// ============================================================================

export interface Curriculum {
  id: string;
  name: string;
  description: string | null;
  course_name: string;
  group_id: string | null;
  status: CurriculumStatus;
  academic_period: string | null;
  created_at: string;
  updated_at: string;
  // Joins / Computeds
  groups?: { id: string; name: string; course_name: string } | null;
  items_count?: number;
  completed_count?: number;
}

export interface CurriculumItem {
  id: string;
  curriculum_id: string;
  order_number: number;
  title: string;
  description: string | null;
  objective: string | null;
  practice: string | null;
  homework_plan: string | null;
  duration_minutes: number;
  category: string | null;
  planned_date: string | null;
  status: CurriculumItemStatus;
  created_at: string;
  updated_at: string;
  // Joins / Computeds
  linked_lesson?: {
    id: string;
    topic: string;
    date: string;
    status: string;
  } | null;
  assignments_count?: number;
}

export interface CurriculumProgress {
  totalItems: number;
  completedItems: number;
  remainingItems: number;
  skippedItems: number;
  progressPercentage: number;
}

// ============================================================================
// IMPORT & FORM SCHEMAS
// ============================================================================

export const curriculumFormSchema = z.object({
  name: z.string().min(2, "Ish reja nomi kamida 2 ta belgidan iborat bo‘lishi kerak"),
  description: z.string().optional().nullable(),
  course_name: z.string().min(1, "Kurs/Fan nomi kiritilishi shart"),
  group_id: z.string().optional().nullable(),
  academic_period: z.string().optional().nullable(),
  status: z.enum(["Faol", "Arxivlangan"]).default("Faol"),
});

export const curriculumItemFormSchema = z.object({
  title: z.string().min(2, "Mavzu nomi kamida 2 ta belgidan iborat bo‘lishi kerak"),
  order_number: z.number().int().positive().optional(),
  description: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  practice: z.string().optional().nullable(),
  homework_plan: z.string().optional().nullable(),
  duration_minutes: z.number().int().positive().default(90),
  category: z.string().optional().nullable(),
  planned_date: z.string().optional().nullable(),
  status: z
    .enum(["Rejalashtirilgan", "O‘tilgan", "O‘tkazib yuborilgan", "Ko‘chirilgan"])
    .default("Rejalashtirilgan"),
});

export type CurriculumFormData = z.infer<typeof curriculumFormSchema>;
export type CurriculumItemFormData = z.infer<typeof curriculumItemFormSchema>;

export interface CurriculumImportRow {
  orderNumber?: number;
  title: string;
  objective?: string;
  description?: string;
  practice?: string;
  homeworkPlan?: string;
  durationMinutes?: number;
  category?: string;
  plannedDate?: string;
}

export interface CurriculumImportPreview {
  totalRows: number;
  validRows: CurriculumImportRow[];
  warningRows: Array<{ row: CurriculumImportRow; warnings: string[] }>;
  invalidRows: Array<{ row: any; errors: string[] }>;
}
