import * as z from "zod";

export const lessonSchema = z.object({
  group_id: z.string().min(1, "Guruhni tanlang"),
  date: z.string().min(1, "Sanani tanlang"),
  start_time: z.string().min(1, "Boshlanish vaqtini kiriting"),
  end_time: z.string().min(1, "Tugash vaqtini kiriting"),
  topic: z.string().min(2, "Dars mavzusi kamida 2 ta belgidan iborat bo‘lishi kerak"),
  description: z.string().optional().nullable(),
  homework: z.string().optional().nullable(),
  status: z.enum(["Rejalashtirilgan", "O‘tkazildi", "Bekor qilindi"]).default("Rejalashtirilgan"),
});

export type LessonFormValues = z.infer<typeof lessonSchema>;
