-- 1. STUDENT DISCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.student_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  month INT NOT NULL,
  year INT NOT NULL,
  discount_percentage INT NOT NULL DEFAULT 20,
  reason TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_student_discounts_student ON public.student_discounts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_discounts_group ON public.student_discounts(group_id);

-- ROW LEVEL SECURITY
ALTER TABLE public.student_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access student_discounts" ON public.student_discounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE TRIGGER trigger_student_discounts_updated_at BEFORE UPDATE ON public.student_discounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
