-- 1. Registration count helper (safe: returns only a number)
CREATE OR REPLACE FUNCTION public.event_registration_count(_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.registrations WHERE event_id = _event_id;
$$;

GRANT EXECUTE ON FUNCTION public.event_registration_count(uuid) TO anon, authenticated, service_role;

-- 2. Quota enforcement trigger
CREATE OR REPLACE FUNCTION public.enforce_event_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap integer;
  used integer;
BEGIN
  SELECT max_participants INTO cap FROM public.events WHERE id = NEW.event_id;
  IF cap IS NULL OR cap <= 0 THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO used FROM public.registrations WHERE event_id = NEW.event_id;
  IF used >= cap THEN
    RAISE EXCEPTION 'Kuota peserta sudah penuh';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registrations_enforce_quota ON public.registrations;
CREATE TRIGGER registrations_enforce_quota
BEFORE INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.enforce_event_quota();

-- 3. Payment categories
CREATE TABLE IF NOT EXISTS public.payment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  whatsapp_number text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_categories TO authenticated;
GRANT ALL ON public.payment_categories TO service_role;

ALTER TABLE public.payment_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_categories_public_read ON public.payment_categories;
CREATE POLICY payment_categories_public_read ON public.payment_categories
FOR SELECT USING (true);

DROP POLICY IF EXISTS payment_categories_admin_all ON public.payment_categories;
CREATE POLICY payment_categories_admin_all ON public.payment_categories
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS payment_categories_set_updated_at ON public.payment_categories;
CREATE TRIGGER payment_categories_set_updated_at
BEFORE UPDATE ON public.payment_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.payment_categories (slug, name, description, is_system, order_index)
VALUES
  ('paid', 'Pembayaran Umum', 'Kategori bawaan untuk event berbayar', true, 0),
  ('infaq', 'Infaq', 'Kategori bawaan untuk infaq / donasi', true, 1)
ON CONFLICT (slug) DO NOTHING;

-- 4. Link QRIS to categories
ALTER TABLE public.qris_methods
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.payment_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_number text;

UPDATE public.qris_methods q
SET category_id = c.id
FROM public.payment_categories c
WHERE q.category_id IS NULL AND c.slug = q.category;

-- 5. Event payment targeting
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS payment_category_id uuid REFERENCES public.payment_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qris_method_id uuid REFERENCES public.qris_methods(id) ON DELETE SET NULL;