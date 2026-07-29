-- Position-specific registration pricing for futsal and mini soccer events.
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS position text;

CREATE TABLE IF NOT EXISTS public.event_position_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  position text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, position),
  CONSTRAINT event_position_pricing_price_positive CHECK (price >= 0),
  CONSTRAINT event_position_pricing_position_not_empty CHECK (length(trim(position)) > 0)
);

ALTER TABLE public.event_position_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_position_pricing_select_all"
  ON public.event_position_pricing FOR SELECT USING (true);
CREATE POLICY "event_position_pricing_insert_admin"
  ON public.event_position_pricing FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "event_position_pricing_update_admin"
  ON public.event_position_pricing FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "event_position_pricing_delete_admin"
  ON public.event_position_pricing FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
