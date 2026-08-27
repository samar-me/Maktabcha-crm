export interface StudentDiscount {
  id: string;
  student_id: string;
  group_id: string;
  month: number;
  year: number;
  discount_percentage: number;
  reason: string;
  is_used: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentDiscountInsert extends Omit<StudentDiscount, "id" | "created_at" | "updated_at"> {}
export interface StudentDiscountUpdate extends Partial<StudentDiscountInsert> {}
