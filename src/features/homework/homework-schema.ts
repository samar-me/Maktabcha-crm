import * as z from "zod";

export const homeworkSchema = z.object({
  group_id: z.string().min(1, "Guruhni tanlang"),
  lesson_id: z.string().optional().nullable(),
  title: z.string().min(2, "Vazifa sarlavhasi kamida 2 ta belgidan iborat bo‘lishi kerak"),
  description: z.string().optional().nullable(),
  assigned_date: z.string().min(1, "Berilgan sanani kiriting"),
  due_date: z.string().optional().nullable(),
});

export type HomeworkFormValues = z.infer<typeof homeworkSchema>;
