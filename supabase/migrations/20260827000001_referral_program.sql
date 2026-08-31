-- Referral program and centralized discount ledger.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_org_referral_code ON public.students(organization_id, referral_code) WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.referral_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  reward_percent NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (reward_percent > 0 AND reward_percent <= 100),
  maximum_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (maximum_discount_percent > 0 AND maximum_discount_percent <= 100),
  qualification_rule TEXT NOT NULL DEFAULT 'first_payment' CHECK (qualification_rule IN ('registration','group_assignment','first_payment')),
  reward_duration TEXT NOT NULL DEFAULT 'one_billing_period' CHECK (reward_duration IN ('one_billing_period','fixed_months','while_referred_active')),
  reward_months SMALLINT NOT NULL DEFAULT 1 CHECK (reward_months BETWEEN 1 AND 60),
  allow_stacking BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.referral_settings (organization_id)
SELECT id FROM public.organizations ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  referrer_student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  referred_student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','rewarded','cancelled')),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  qualified_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, referred_student_id),
  CHECK (referrer_student_id <> referred_student_id)
);

CREATE TABLE IF NOT EXISTS public.discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  referral_id UUID UNIQUE REFERENCES public.referrals(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('referral','scholarship','manual','promotion','other')),
  percent NUMERIC(5,2) CHECK (percent BETWEEN 0 AND 100),
  amount NUMERIC(12,2) CHECK (amount >= 0),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  remaining_billing_periods SMALLINT,
  active BOOLEAN NOT NULL DEFAULT true,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (percent IS NOT NULL OR amount IS NOT NULL),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS base_amount NUMERIC(12,2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS final_amount NUMERIC(12,2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS include_in_revenue BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_amount_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check CHECK (amount >= 0);

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant referral settings" ON public.referral_settings;
DROP POLICY IF EXISTS "Tenant referrals" ON public.referrals;
DROP POLICY IF EXISTS "Tenant discounts" ON public.discounts;
CREATE POLICY "Tenant referral settings" ON public.referral_settings FOR ALL TO authenticated USING (organization_id = public.current_organization_id()) WITH CHECK (organization_id = public.current_organization_id());
CREATE POLICY "Tenant referrals" ON public.referrals FOR ALL TO authenticated USING (organization_id = public.current_organization_id()) WITH CHECK (organization_id = public.current_organization_id());
CREATE POLICY "Tenant discounts" ON public.discounts FOR ALL TO authenticated USING (organization_id = public.current_organization_id()) WITH CHECK (organization_id = public.current_organization_id());

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status ON public.referrals(organization_id, referrer_student_id, status);
CREATE INDEX IF NOT EXISTS idx_discounts_student_active ON public.discounts(organization_id, student_id, active);

CREATE OR REPLACE FUNCTION public.make_referral_code(p_first_name TEXT, p_id UUID) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$ SELECT upper(regexp_replace(left(coalesce(p_first_name,'MAK'),5), '[^a-zA-Z0-9]', '', 'g')) || '-' || upper(substr(replace(p_id::text,'-',''),1,4)) $$;

CREATE OR REPLACE FUNCTION public.ensure_student_referral_code() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.referral_code := coalesce(NEW.referral_code, public.make_referral_code(NEW.first_name, NEW.id)); RETURN NEW; END $$;
CREATE OR REPLACE TRIGGER trg_student_referral_code BEFORE INSERT OR UPDATE OF first_name ON public.students FOR EACH ROW EXECUTE FUNCTION public.ensure_student_referral_code();
UPDATE public.students SET referral_code = public.make_referral_code(first_name,id) WHERE referral_code IS NULL;

CREATE OR REPLACE FUNCTION public.calculate_student_discount(p_organization_id UUID, p_student_id UUID, p_group_id UUID, p_base_amount NUMERIC, p_on_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB LANGUAGE sql STABLE AS $$
WITH cfg AS (SELECT maximum_discount_percent,allow_stacking FROM referral_settings WHERE organization_id=p_organization_id), applicable AS (
  SELECT type, least(100, coalesce(percent,0)) percent, coalesce(amount,0) amount
  FROM public.discounts WHERE organization_id=p_organization_id AND student_id=p_student_id AND active
    AND (group_id IS NULL OR group_id=p_group_id) AND start_date<=p_on_date AND (end_date IS NULL OR end_date>=p_on_date)
), totals AS (
  SELECT least(coalesce(cfg.maximum_discount_percent,100),CASE WHEN coalesce(cfg.allow_stacking,true) THEN coalesce(sum(percent),0) ELSE coalesce(max(percent),0) END) pct,
         CASE WHEN coalesce(cfg.allow_stacking,true) THEN coalesce(sum(amount),0) ELSE coalesce(max(amount),0) END fixed,
         CASE WHEN bool_or(type='referral') THEN 'referral' ELSE max(type) END dtype FROM applicable CROSS JOIN cfg GROUP BY cfg.maximum_discount_percent,cfg.allow_stacking
), calc AS (
  SELECT pct, least(p_base_amount, round(p_base_amount*pct/100 + fixed,2)) discount, dtype FROM totals
)
SELECT jsonb_build_object('baseAmount',p_base_amount,'discountPercent',pct,'discountAmount',discount,'finalAmount',greatest(0,p_base_amount-discount),'discountType',dtype,'paymentStatus',CASE WHEN p_base_amount-discount<=0 THEN 'paid' ELSE 'due' END,'includeInRevenue',p_base_amount-discount>0) FROM calc $$;

CREATE OR REPLACE FUNCTION public.qualify_referral_after_payment() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r referrals%ROWTYPE; cfg referral_settings%ROWTYPE; end_on DATE; periods SMALLINT;
BEGIN
  IF TG_OP='DELETE' OR NEW.cancelled_at IS NOT NULL OR NEW.payment_status<>'paid' OR coalesce(NEW.final_amount,NEW.amount)<=0 THEN RETURN coalesce(NEW,OLD); END IF;
  SELECT * INTO r FROM referrals WHERE organization_id=NEW.organization_id AND referred_student_id=NEW.student_id AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM students s WHERE s.id=NEW.student_id AND s.status='Faol') OR NOT EXISTS (SELECT 1 FROM group_students gs WHERE gs.student_id=NEW.student_id AND gs.status='Faol') THEN RETURN NEW; END IF;
  SELECT * INTO cfg FROM referral_settings WHERE organization_id=NEW.organization_id;
  IF NOT cfg.enabled THEN RETURN NEW; END IF;
  periods := CASE WHEN cfg.reward_duration='one_billing_period' THEN 1 WHEN cfg.reward_duration='fixed_months' THEN cfg.reward_months ELSE NULL END;
  end_on := CASE WHEN periods IS NULL THEN NULL ELSE (CURRENT_DATE + (periods || ' months')::interval)::date END;
  UPDATE referrals SET status='rewarded',discount_percent=cfg.reward_percent,qualified_at=now(),rewarded_at=now(),updated_at=now() WHERE id=r.id;
  INSERT INTO discounts(organization_id,student_id,referral_id,type,percent,start_date,end_date,remaining_billing_periods,reason)
  VALUES(NEW.organization_id,r.referrer_student_id,r.id,'referral',cfg.reward_percent,CURRENT_DATE,end_on,periods,'Successful referral reward');
  RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER trg_qualify_referral AFTER INSERT OR UPDATE OF payment_status,cancelled_at ON public.payments FOR EACH ROW EXECUTE FUNCTION public.qualify_referral_after_payment();

CREATE OR REPLACE FUNCTION public.evaluate_referral_qualification(p_organization_id UUID,p_referred_student_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r referrals%ROWTYPE;cfg referral_settings%ROWTYPE;periods SMALLINT;end_on DATE;eligible BOOLEAN:=false;
BEGIN SELECT * INTO r FROM referrals WHERE organization_id=p_organization_id AND referred_student_id=p_referred_student_id AND status<>'cancelled' FOR UPDATE;IF NOT FOUND THEN RETURN;END IF;SELECT * INTO cfg FROM referral_settings WHERE organization_id=p_organization_id;IF NOT cfg.enabled THEN RETURN;END IF;
 IF cfg.qualification_rule='first_payment' AND NOT EXISTS(SELECT 1 FROM payments WHERE organization_id=p_organization_id AND student_id=p_referred_student_id AND payment_status='paid' AND cancelled_at IS NULL AND coalesce(final_amount,amount)>0) THEN UPDATE referrals SET status='pending',qualified_at=NULL,rewarded_at=NULL,updated_at=now()WHERE id=r.id;UPDATE discounts SET active=false,updated_at=now()WHERE referral_id=r.id;RETURN;END IF;
 IF r.status IN('qualified','rewarded')THEN RETURN;END IF;
 eligible:=cfg.qualification_rule='registration' OR (cfg.qualification_rule='group_assignment' AND EXISTS(SELECT 1 FROM group_students WHERE student_id=p_referred_student_id AND status='Faol')) OR (cfg.qualification_rule='first_payment' AND EXISTS(SELECT 1 FROM group_students WHERE student_id=p_referred_student_id AND status='Faol') AND EXISTS(SELECT 1 FROM payments WHERE organization_id=p_organization_id AND student_id=p_referred_student_id AND payment_status='paid' AND cancelled_at IS NULL AND coalesce(final_amount,amount)>0));
 IF NOT eligible OR NOT EXISTS(SELECT 1 FROM students WHERE id=p_referred_student_id AND status='Faol') THEN RETURN;END IF;periods:=CASE WHEN cfg.reward_duration='one_billing_period'THEN 1 WHEN cfg.reward_duration='fixed_months'THEN cfg.reward_months ELSE NULL END;end_on:=CASE WHEN periods IS NULL THEN NULL ELSE(CURRENT_DATE+(periods||' months')::interval)::date END;
 UPDATE referrals SET status='rewarded',discount_percent=cfg.reward_percent,qualified_at=now(),rewarded_at=now(),updated_at=now()WHERE id=r.id;INSERT INTO discounts(organization_id,student_id,referral_id,type,percent,start_date,end_date,remaining_billing_periods,reason)VALUES(p_organization_id,r.referrer_student_id,r.id,'referral',cfg.reward_percent,CURRENT_DATE,end_on,periods,'Successful referral reward')ON CONFLICT(referral_id)DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.referral_evaluate_on_referral()RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$BEGIN PERFORM evaluate_referral_qualification(NEW.organization_id,NEW.referred_student_id);RETURN NEW;END$$;
CREATE OR REPLACE FUNCTION public.referral_evaluate_on_group()RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$BEGIN IF NEW.status='Faol'THEN PERFORM evaluate_referral_qualification(NEW.organization_id,NEW.student_id);END IF;RETURN NEW;END$$;
CREATE OR REPLACE FUNCTION public.referral_evaluate_on_payment()RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$BEGIN PERFORM evaluate_referral_qualification(coalesce(NEW.organization_id,OLD.organization_id),coalesce(NEW.student_id,OLD.student_id));RETURN coalesce(NEW,OLD);END$$;
DROP TRIGGER IF EXISTS trg_qualify_referral ON public.payments;
DROP TRIGGER IF EXISTS trg_referral_on_payment ON public.payments;
DROP TRIGGER IF EXISTS trg_referral_on_payment_delete ON public.payments;
DROP TRIGGER IF EXISTS trg_referral_on_group ON public.group_students;
DROP TRIGGER IF EXISTS trg_referral_on_create ON public.referrals;
CREATE TRIGGER trg_referral_on_payment AFTER INSERT OR UPDATE OF payment_status,cancelled_at ON public.payments FOR EACH ROW EXECUTE FUNCTION referral_evaluate_on_payment();
CREATE TRIGGER trg_referral_on_payment_delete AFTER DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION referral_evaluate_on_payment();
CREATE TRIGGER trg_referral_on_group AFTER INSERT OR UPDATE OF status ON public.group_students FOR EACH ROW EXECUTE FUNCTION referral_evaluate_on_group();
CREATE TRIGGER trg_referral_on_create AFTER INSERT ON public.referrals FOR EACH ROW EXECUTE FUNCTION referral_evaluate_on_referral();
