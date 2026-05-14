
-- ============ PROGRAMS ============
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  gender_restriction public.gender,
  qr_token text NOT NULL DEFAULT gen_random_uuid()::text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY programs_public_read ON public.programs FOR SELECT USING (true);
CREATE POLICY programs_admin_all ON public.programs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_programs_updated BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default programs
INSERT INTO public.programs (code, name, description, gender_restriction) VALUES
  ('NGAJI_ASYIK', 'Ngaji Asyik', 'Program kajian (NADA, LUKA, CINTA)', NULL),
  ('AMIDA', 'AMIDA', 'Program khusus perempuan', 'P');

-- ============ EVENTS.program_id ============
ALTER TABLE public.events ADD COLUMN program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;
CREATE INDEX idx_events_program ON public.events(program_id);

-- ============ Unique attendance ============
ALTER TABLE public.attendance ADD CONSTRAINT attendance_event_user_uniq UNIQUE (event_id, user_id);

-- ============ Gender restriction trigger ============
CREATE OR REPLACE FUNCTION public.enforce_program_gender()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prog_gender public.gender;
  user_gender public.gender;
BEGIN
  SELECT p.gender_restriction INTO prog_gender
    FROM public.events e LEFT JOIN public.programs p ON p.id = e.program_id
    WHERE e.id = NEW.event_id;
  IF prog_gender IS NULL THEN RETURN NEW; END IF;
  SELECT gender INTO user_gender FROM public.profiles WHERE id = NEW.user_id;
  IF user_gender IS DISTINCT FROM prog_gender THEN
    RAISE EXCEPTION 'Program ini hanya untuk gender %', prog_gender;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_reg_gender BEFORE INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_program_gender();
CREATE TRIGGER trg_att_gender BEFORE INSERT ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.enforce_program_gender();

-- ============ LOGIN EVENTS ============
CREATE TABLE public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY login_insert_own ON public.login_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY login_select_admin ON public.login_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY login_select_own ON public.login_events FOR SELECT
  USING (auth.uid() = user_id);
CREATE INDEX idx_login_events_created ON public.login_events(created_at DESC);

-- ============ Resolve program QR -> active event ============
CREATE OR REPLACE FUNCTION public.find_active_event_by_program_token(_token text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id FROM public.events e
  JOIN public.programs p ON p.id = e.program_id
  WHERE p.qr_token = _token
    AND e.status = 'active'
    AND now() >= e.starts_at - INTERVAL '1 hour'
    AND now() <= COALESCE(e.ends_at, e.starts_at + INTERVAL '6 hours')
  ORDER BY e.starts_at ASC LIMIT 1;
$$;

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.programs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
