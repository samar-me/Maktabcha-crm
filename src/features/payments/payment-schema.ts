import * as z from "zod";

export const paymentSchema = z.object({
  student_id: z.string().min(1, "O‘quvchini tanlang"),
  group_id: z.string().min(1, "Guruhni tanlang"),
  amount: z.coerce.number().min(1000, "To‘lov summasi kamida 1 000 so‘m bo‘lishi kerak"),
  payment_date: z.string().min(1, "To‘lov sanasini kiriting"),
  payment_method: z.enum(["Naqd", "Karta", "O‘tkazma", "Boshqa"]).default("Karta"),
  month: z.coerce.number().min(1).max(12).default(new Date().getMonth() + 1),
  year: z.coerce.number().min(2020).max(2030).default(new Date().getFullYear()),
  note: z.string().optional().nullable(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
