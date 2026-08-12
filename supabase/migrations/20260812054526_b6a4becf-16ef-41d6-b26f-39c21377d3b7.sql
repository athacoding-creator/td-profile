ALTER TABLE public.event_position_pricing ADD COLUMN IF NOT EXISTS max_slots integer;

CREATE OR REPLACE FUNCTION public.event_position_count(_event_id uuid, _position text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::int FROM public.registrations
  WHERE event_id = _event_id AND position = _position;
$$;

GRANT EXECUTE ON FUNCTION public.event_position_count(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_position_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cap integer;
  used integer;
BEGIN
  IF NEW.position IS NULL OR NEW.position = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.position IS NOT DISTINCT FROM OLD.position THEN RETURN NEW; END IF;

  SELECT max_slots INTO cap
    FROM public.event_position_pricing
    WHERE event_id = NEW.event_id AND position = NEW.position AND is_active = true
    LIMIT 1;

  IF cap IS NULL OR cap <= 0 THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO used FROM public.registrations
    WHERE event_id = NEW.event_id AND position = NEW.position AND id IS DISTINCT FROM NEW.id;

  IF used >= cap THEN
    RAISE EXCEPTION 'Kuota posisi % sudah penuh', NEW.position;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registrations_enforce_position_quota ON public.registrations;
CREATE TRIGGER registrations_enforce_position_quota
BEFORE INSERT OR UPDATE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.enforce_position_quota();