
-- 1. app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_read_auth" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_admin_all" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings(key, value) VALUES
  ('profile_complete_bonus', 50),
  ('default_attendance_points', 10)
ON CONFLICT (key) DO NOTHING;

-- 2. updated_at trigger
DROP TRIGGER IF EXISTS trg_app_settings_updated ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Update profile-complete trigger to read bonus from settings
CREATE OR REPLACE FUNCTION public.check_profile_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  complete BOOLEAN;
  bonus INTEGER;
BEGIN
  complete := (NEW.full_name IS NOT NULL AND NEW.gender IS NOT NULL AND NEW.phone IS NOT NULL
               AND NEW.city IS NOT NULL AND NEW.birth_date IS NOT NULL AND NEW.address IS NOT NULL);
  NEW.is_complete := complete;
  IF complete AND NOT COALESCE(OLD.bonus_awarded, false) THEN
    SELECT value INTO bonus FROM public.app_settings WHERE key = 'profile_complete_bonus';
    bonus := COALESCE(bonus, 50);
    NEW.bonus_awarded := true;
    NEW.points := COALESCE(NEW.points,0) + bonus;
    INSERT INTO public.point_transactions(user_id, amount, reason)
      VALUES (NEW.id, bonus, 'profile_complete_bonus');
  END IF;
  RETURN NEW;
END $function$;

-- 4. Enable Realtime
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.redemptions REPLICA IDENTITY FULL;
ALTER TABLE public.point_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
ALTER TABLE public.app_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='events';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.events; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='redemptions';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.redemptions; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='point_transactions';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.point_transactions; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='attendance';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='app_settings';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings; END IF;
END $$;

-- 5. Ensure attendance has a unique constraint so admin scans don't double-credit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_user_event_uniq'
  ) THEN
    ALTER TABLE public.attendance ADD CONSTRAINT attendance_user_event_uniq UNIQUE (user_id, event_id);
  END IF;
END $$;

-- 6. Allow admin to insert attendance on behalf of any user (for scanning at venue)
DROP POLICY IF EXISTS att_insert_admin ON public.attendance;
CREATE POLICY att_insert_admin ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
