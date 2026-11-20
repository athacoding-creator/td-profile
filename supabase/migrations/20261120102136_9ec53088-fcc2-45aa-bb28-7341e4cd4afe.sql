CREATE TABLE public.event_types (
  value text PRIMARY KEY,
  label text NOT NULL,
  default_registration_type text NOT NULL DEFAULT 'free' CHECK (default_registration_type IN ('free', 'infaq', 'paid')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_types TO authenticated;
GRANT ALL ON public.event_types TO service_role;
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active event types" ON public.event_types FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
CREATE POLICY "Admins can manage event types" ON public.event_types FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER event_types_set_updated_at BEFORE UPDATE ON public.event_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.event_types (value, label, default_registration_type, sort_order)
SELECT value,
       CASE WHEN value = 'kajian' THEN 'Kajian (lama)' ELSE value END,
       default_registration_type,
       row_number() OVER (ORDER BY value)::integer
FROM (
  SELECT event_type AS value,
         (array_agg(registration_type ORDER BY mode_count DESC, registration_type))[1] AS default_registration_type
  FROM (
    SELECT event_type, registration_type, count(*) AS mode_count
    FROM public.events
    WHERE NULLIF(btrim(event_type), '') IS NOT NULL
      AND registration_type IN ('free', 'infaq', 'paid')
    GROUP BY event_type, registration_type
  ) modes
  GROUP BY event_type
) existing_types
ON CONFLICT (value) DO NOTHING;