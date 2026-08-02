-- 1. Guest rows: user_id optional
ALTER TABLE public.registrations ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_event_user_unique;
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_user_event_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS registrations_user_event_uniq_idx
  ON public.registrations (user_id, event_id) WHERE user_id IS NOT NULL;

-- 2. RLS for guest registrations
DROP POLICY IF EXISTS reg_insert_own ON public.registrations;
CREATE POLICY reg_insert_own ON public.registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (user_id IS NULL AND registered_by = auth.uid())
  );

DROP POLICY IF EXISTS reg_update_own ON public.registrations;
CREATE POLICY reg_update_own ON public.registrations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND registered_by = auth.uid()))
  WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND registered_by = auth.uid()));

DROP POLICY IF EXISTS reg_delete_own ON public.registrations;
CREATE POLICY reg_delete_own ON public.registrations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND registered_by = auth.uid()));

-- 3. Gender check safe for guests
CREATE OR REPLACE FUNCTION public.enforce_program_gender_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prog_gender public.gender;
  subject_gender public.gender;
BEGIN
  SELECT p.gender_restriction INTO prog_gender
    FROM public.events e LEFT JOIN public.programs p ON p.id = e.program_id
    WHERE e.id = NEW.event_id;
  IF prog_gender IS NULL THEN RETURN NEW; END IF;

  IF NEW.user_id IS NULL THEN
    IF NEW.guest_gender IS NULL OR NEW.guest_gender = '' THEN RETURN NEW; END IF;
    subject_gender := NEW.guest_gender::public.gender;
  ELSE
    SELECT gender INTO subject_gender FROM public.profiles WHERE id = NEW.user_id;
    IF subject_gender IS NULL THEN RETURN NEW; END IF;
  END IF;

  IF subject_gender IS DISTINCT FROM prog_gender THEN
    RAISE EXCEPTION 'Program ini hanya untuk gender %', prog_gender;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registrations_enforce_gender ON public.registrations;
CREATE TRIGGER registrations_enforce_gender
  BEFORE INSERT OR UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_program_gender_registration();

-- 4. Amount validation: position based pricing for sport events
CREATE OR REPLACE FUNCTION public.validate_registration_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ev RECORD;
  pos_price numeric;
BEGIN
  SELECT registration_type, price, min_infaq, max_infaq, event_type
  INTO ev
  FROM public.events
  WHERE id = NEW.event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event tidak ditemukan: %', NEW.event_id;
  END IF;

  IF ev.event_type IN ('futsal', 'mini-soccer') AND ev.registration_type = 'paid' THEN
    IF NEW.position IS NULL OR NEW.position = '' THEN
      RAISE EXCEPTION 'Pilih posisi terlebih dahulu';
    END IF;
    SELECT price INTO pos_price
      FROM public.event_position_pricing
      WHERE event_id = NEW.event_id AND position = NEW.position AND is_active = true
      LIMIT 1;
    IF pos_price IS NULL THEN
      RAISE EXCEPTION 'Harga untuk posisi % belum diatur admin', NEW.position;
    END IF;
    IF NEW.amount_paid IS NULL OR abs(NEW.amount_paid - pos_price) > 1 THEN
      RAISE EXCEPTION 'Nominal harus sesuai harga posisi (%). Diterima: %', pos_price, NEW.amount_paid;
    END IF;
    RETURN NEW;
  END IF;

  IF ev.registration_type = 'paid' THEN
    IF NEW.amount_paid IS NULL OR abs(NEW.amount_paid - ev.price) > 1 THEN
      RAISE EXCEPTION 'Nominal harus sesuai harga event (%). Diterima: %', ev.price, NEW.amount_paid;
    END IF;
  ELSIF ev.registration_type = 'infaq' THEN
    IF NEW.amount_paid IS NULL THEN
      RAISE EXCEPTION 'Nominal infaq wajib diisi.';
    END IF;
    IF NEW.amount_paid < COALESCE(ev.min_infaq, 0) THEN
      RAISE EXCEPTION 'Nominal infaq di bawah minimum (%). Diterima: %', ev.min_infaq, NEW.amount_paid;
    END IF;
    IF ev.max_infaq IS NOT NULL AND ev.max_infaq > 0 AND NEW.amount_paid > ev.max_infaq THEN
      RAISE EXCEPTION 'Nominal infaq di atas maksimum (%). Diterima: %', ev.max_infaq, NEW.amount_paid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Fix admin checks that used the broken text-based has_role
DROP POLICY IF EXISTS event_position_pricing_insert_admin ON public.event_position_pricing;
DROP POLICY IF EXISTS event_position_pricing_update_admin ON public.event_position_pricing;
DROP POLICY IF EXISTS event_position_pricing_delete_admin ON public.event_position_pricing;
DROP POLICY IF EXISTS event_position_pricing_select_all ON public.event_position_pricing;

CREATE POLICY event_position_pricing_select_all ON public.event_position_pricing
  FOR SELECT USING (true);
CREATE POLICY event_position_pricing_admin_all ON public.event_position_pricing
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.event_position_pricing TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_position_pricing TO authenticated;
GRANT ALL ON public.event_position_pricing TO service_role;

DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admins can view all payment methods" ON public.payment_methods;
CREATE POLICY payment_methods_admin_all ON public.payment_methods
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP FUNCTION IF EXISTS public.has_role(uuid, text);