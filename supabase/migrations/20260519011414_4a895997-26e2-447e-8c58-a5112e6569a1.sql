-- Auto-register on attendance scan + secure qr_token columns

CREATE OR REPLACE FUNCTION public.record_attendance(_event_id uuid, _token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE evid uuid; ev_token text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Harus login'; END IF;
  SELECT qr_token INTO ev_token FROM public.events WHERE id = _event_id;
  IF ev_token IS NULL THEN RAISE EXCEPTION 'Event tidak ditemukan'; END IF;
  IF ev_token = _token THEN
    evid := _event_id;
  ELSE
    evid := public.find_active_event_by_program_token(_token);
    IF evid IS NULL THEN RAISE EXCEPTION 'QR tidak valid atau program belum dimulai'; END IF;
  END IF;
  -- Auto-register if not already registered (ignore duplicates)
  INSERT INTO public.registrations(event_id, user_id)
    VALUES (evid, auth.uid())
    ON CONFLICT DO NOTHING;
  INSERT INTO public.attendance(event_id, user_id) VALUES (evid, auth.uid());
  RETURN evid;
END $function$;

-- Ensure qr_token is NOT exposed to anon/authenticated via public read policies
REVOKE SELECT (qr_token) ON public.events FROM anon, authenticated;
REVOKE SELECT (qr_token) ON public.programs FROM anon, authenticated;