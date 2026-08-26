import * as z from "zod";

export const scheduleItemSchema = z.object({
  day: z.string().min(1, "Kunni tanlang"),
  start_time: z.string().min(1, "Boshlanish vaqtini kiriting"),
  end_time: z.string().min(1, "Tugash vaqtini kiriting"),
});

export const groupSchema = z.object({
  name: z.string().min(2, "Guruh nomi kamida 2 ta belgidan iborat bo‘lishi kerak"),
  course_name: z.string().min(2, "Kurs nomi kamida 2 ta belgidan iborat bo‘lishi kerak"),
  teacher_name: z.string().min(2, "O‘qituvchi ismi kamida 2 ta belgidan iborat bo‘lishi kerak"),
  monthly_fee: z.coerce.number().min(0, "Oylik to‘lov 0 dan kam bo‘lmasligi kerak"),
  room: z.string().optional().nullable(),
  start_date: z.string().default(() => new Date().toISOString().split("T")[0]),
  status: z.enum(["Faol", "Yopilgan", "Rejalashtirilgan"]).default("Faol"),
  schedule: z.array(scheduleItemSchema).min(1, "Kamida bitta dars kunini belgilang"),
});

export type GroupFormValues = z.infer<typeof groupSchema>;
