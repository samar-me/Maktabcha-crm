import * as z from "zod";

export const gradeSchema = z.object({
  student_id: z.string().min(1, "O‘quvchini tanlang"),
  group_id: z.string().min(1, "Guruhni tanlang"),
  lesson_id: z.string().optional().nullable(),
  title: z.string().min(2, "Baholash nomini kiriting (masalan: Oraliq nazorat #1)"),
  score: z.coerce.number().min(0, "Ball 0 dan kichik bo‘lishi mumkin emas"),
  max_score: z.coerce.number().min(1, "Maksimal ball kamida 1 bo‘lishi kerak").default(100),
  date: z.string().min(1, "Sanani kiriting"),
  notes: z.string().optional().nullable(),
});

export type GradeFormValues = z.infer<typeof gradeSchema>;
