-- Maktabcha Super Admin AI: tenant scope, confirmations, audit and billing exceptions.
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.organizations (name, slug)
VALUES ('Maktabcha O‘quv Markazi', 'default')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['students','groups','group_students','lessons','attendance','homework','homework_submissions','grades','payments','settings','curricula','curriculum_items','student_discounts','telegram_group_links']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id)', t);
      EXECUTE format('UPDATE public.%I SET organization_id = (SELECT id FROM public.organizations WHERE slug = ''default'') WHERE organization_id IS NULL', t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (organization_id)', 'idx_' || t || '_organization', t);
    END IF;
  END LOOP;
END $$;

UPDATE public.profiles SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'default') WHERE organization_id IS NULL;

CREATE TABLE IF NOT EXISTS public.ai_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tool TEXT NOT NULL,
  risk_level SMALLINT NOT NULL CHECK (risk_level BETWEEN 0 AND 4),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmation_phrase TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','executed','expired','cancelled','failed')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '15 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ai_request TEXT,
  tool TEXT NOT NULL,
  risk_level SMALLINT NOT NULL,
  entity_type TEXT,
  entity_ids UUID[] NOT NULL DEFAULT '{}',
  before_data JSONB,
  after_data JSONB,
  confirmation JSONB,
  status TEXT NOT NULL CHECK (status IN ('success','failed','previewed','cancelled')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  billing_type TEXT NOT NULL CHECK (billing_type IN ('scholarship','discount','free','custom')),
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (discount_percentage BETWEEN 0 AND 100),
  display_as_paid BOOLEAN NOT NULL DEFAULT true,
  include_in_revenue BOOLEAN NOT NULL DEFAULT false,
  suppress_debt_notifications BOOLEAN NOT NULL DEFAULT true,
  restore_previous_tariff BOOLEAN NOT NULL DEFAULT true,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_exceptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_organization_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.profiles WHERE id = auth.uid() $$;

DROP POLICY IF EXISTS "Users see own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users access own AI actions" ON public.ai_pending_actions;
DROP POLICY IF EXISTS "Users read own organization audit" ON public.ai_audit_logs;
DROP POLICY IF EXISTS "Users access own billing exceptions" ON public.billing_exceptions;
CREATE POLICY "Users see own organization" ON public.organizations FOR SELECT TO authenticated
USING (id = public.current_organization_id());
CREATE POLICY "Users access own AI actions" ON public.ai_pending_actions FOR ALL TO authenticated
USING (organization_id = public.current_organization_id() AND user_id = auth.uid())
WITH CHECK (organization_id = public.current_organization_id() AND user_id = auth.uid());
CREATE POLICY "Users read own organization audit" ON public.ai_audit_logs FOR SELECT TO authenticated
USING (organization_id = public.current_organization_id());
CREATE POLICY "Users access own billing exceptions" ON public.billing_exceptions FOR ALL TO authenticated
USING (organization_id = public.current_organization_id())
WITH CHECK (organization_id = public.current_organization_id());

-- One atomic operation: old membership closes and new membership opens together.
CREATE OR REPLACE FUNCTION public.ai_move_student_group(p_organization_id UUID, p_student_id UUID, p_from_group_id UUID, p_to_group_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_row group_students%ROWTYPE; new_row group_students%ROWTYPE;
BEGIN
  SELECT * INTO old_row FROM group_students WHERE organization_id = p_organization_id AND student_id = p_student_id AND group_id = p_from_group_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'active membership not found'; END IF;
  UPDATE group_students SET status = 'Chiqib ketgan' WHERE id = old_row.id;
  INSERT INTO group_students (organization_id, student_id, group_id, joined_at, status)
  VALUES (p_organization_id, p_student_id, p_to_group_id, CURRENT_DATE, 'Faol')
  ON CONFLICT (group_id, student_id) DO UPDATE SET status = 'Faol', joined_at = CURRENT_DATE
  RETURNING * INTO new_row;
  RETURN jsonb_build_object('from', to_jsonb(old_row), 'to', to_jsonb(new_row));
END $$;
REVOKE ALL ON FUNCTION public.ai_move_student_group(UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_move_student_group(UUID, UUID, UUID, UUID) TO service_role;
