-- Event capacity and registrations made by a logged-in user on behalf of a guest.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS max_participants integer;

ALTER TABLE public.registrations
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_phone text,
  ADD COLUMN IF NOT EXISTS guest_gender text,
  ADD COLUMN IF NOT EXISTS registered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD CONSTRAINT events_max_participants_positive CHECK (max_participants IS NULL OR max_participants > 0);

ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_guest_gender_valid CHECK (guest_gender IS NULL OR guest_gender IN ('L', 'P'));

DROP POLICY IF EXISTS "reg_insert_own" ON public.registrations;
DROP POLICY IF EXISTS "reg_update_own" ON public.registrations;
DROP POLICY IF EXISTS "reg_select_own" ON public.registrations;

CREATE POLICY "reg_insert_own" ON public.registrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR registered_by = auth.uid());

CREATE POLICY "reg_update_own" ON public.registrations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR registered_by = auth.uid())
  WITH CHECK (user_id = auth.uid() OR registered_by = auth.uid());

CREATE POLICY "reg_select_own" ON public.registrations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR registered_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.created_by = auth.uid())
  );
