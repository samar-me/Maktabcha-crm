import * as z from "zod";

export const studentSchema = z.object({
  first_name: z.string().min(2, "Ism kamida 2 ta belgidan iborat bo‘lishi kerak"),
  last_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  parent_name: z.string().optional().nullable(),
  parent_phone: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  gender: z.enum(["Erkak", "Ayol"]).optional().nullable(),
  address: z.string().optional().nullable(),
  status: z.enum(["Faol", "Ta’til", "Bitirgan", "Tark etgan"]).default("Faol"),
  group_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  referral_code_input: z.string().max(32).optional().nullable(),
});

export type StudentFormValues = z.infer<typeof studentSchema>;
