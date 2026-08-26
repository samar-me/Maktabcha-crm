-- Migration: Curriculum Plans, Items, Lesson & Assignment Linkage
-- Created: 2025-01-01 00:00:04

-- 1. CURRICULA (O‘quv dasturlari / Ish rejalar)
CREATE TABLE IF NOT EXISTS public.curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  course_name TEXT NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Faol' CHECK (status IN ('Faol', 'Arxivlangan')),
  academic_period TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CURRICULUM ITEMS (Rejalashtirilgan dars mavzulari)
CREATE TABLE IF NOT EXISTS public.curriculum_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID NOT NULL REFERENCES public.curricula(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  practice TEXT,
  homework_plan TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  category TEXT,
  planned_date DATE,
  status TEXT NOT NULL DEFAULT 'Rejalashtirilgan' CHECK (status IN ('Rejalashtirilgan', 'O‘tilgan', 'O‘tkazib yuborilgan', 'Ko‘chirilgan')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_curriculum_order UNIQUE (curriculum_id, order_number)
);

-- 3. LINK LESSONS AND ASSIGNMENTS TO CURRICULUM ITEMS (Nullable relations)
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS curriculum_item_id UUID REFERENCES public.curriculum_items(id) ON DELETE SET NULL;

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS curriculum_item_id UUID REFERENCES public.curriculum_items(id) ON DELETE SET NULL;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_curricula_group_id ON public.curricula(group_id);
CREATE INDEX IF NOT EXISTS idx_curricula_status ON public.curricula(status);
CREATE INDEX IF NOT EXISTS idx_curriculum_items_curriculum_id ON public.curriculum_items(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_items_order ON public.curriculum_items(curriculum_id, order_number);
CREATE INDEX IF NOT EXISTS idx_curriculum_items_status ON public.curriculum_items(status);
CREATE INDEX IF NOT EXISTS idx_lessons_curriculum_item_id ON public.lessons(curriculum_item_id);
CREATE INDEX IF NOT EXISTS idx_assignments_curriculum_item_id ON public.assignments(curriculum_item_id);

-- 5. ENABLE ROW LEVEL SECURITY (Admin access only)
ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on curricula" ON public.curricula
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access on curriculum_items" ON public.curriculum_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. ATOMIC HELPER FUNCTION TO REORDER OR SHIFT CURRICULUM ITEMS
CREATE OR REPLACE FUNCTION public.shift_curriculum_items_order(
  p_curriculum_id UUID,
  p_from_order INTEGER,
  p_shift INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Shift order numbers without unique constraint conflict by using temporary offset
  IF p_shift > 0 THEN
    UPDATE public.curriculum_items
    SET order_number = order_number + p_shift
    WHERE curriculum_id = p_curriculum_id AND order_number >= p_from_order;
  END IF;
END;
$$;
