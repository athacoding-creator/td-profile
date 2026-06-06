-- Update record_attendance to allow scanning 6 hours before event starts
CREATE OR REPLACE FUNCTION public.record_attendance(_event_id uuid, _token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  evid uuid;
  ev RECORD;
  reg RECORD;
  local_ts timestamp;
  local_date date;
  local_time time;
  local_dow int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Harus login'; END IF;

  SELECT * INTO ev FROM public.events WHERE id = _event_id;
  IF ev.id IS NULL THEN RAISE EXCEPTION 'Event tidak ditemukan'; END IF;

  IF ev.qr_token = _token THEN
    evid := ev.id;
  ELSE
    evid := public.find_active_event_by_program_token(_token);
    IF evid IS NULL THEN RAISE EXCEPTION 'QR tidak valid atau program belum dimulai'; END IF;
    SELECT * INTO ev FROM public.events WHERE id = evid;
  END IF;

  -- Check if event requires payment/infaq and if user has paid
  IF ev.registration_type != 'free' THEN
    SELECT * INTO reg FROM public.registrations WHERE event_id = evid AND user_id = auth.uid();
    IF reg.id IS NULL THEN
      RAISE EXCEPTION 'Kamu belum terdaftar di event ini';
    END IF;
    IF reg.payment_status != 'approved' THEN
      RAISE EXCEPTION 'Pembayaran/Infaq kamu belum diverifikasi oleh admin';
    END IF;
  END IF;

  IF ev.is_recurring THEN
    local_ts := (now() AT TIME ZONE 'Asia/Jakarta');
    local_date := local_ts::date;
    local_time := local_ts::time;
    local_dow := EXTRACT(DOW FROM local_ts)::int;

    IF ev.recurring_until IS NOT NULL AND local_date > ev.recurring_until THEN
      RAISE EXCEPTION 'Event berkelanjutan sudah berakhir';
    END IF;
    IF array_length(ev.recurring_days, 1) IS NULL OR NOT (local_dow = ANY(ev.recurring_days)) THEN
      RAISE EXCEPTION 'Event tidak berlangsung hari ini';
    END IF;
    IF ev.recurring_start_time IS NULL OR ev.recurring_end_time IS NULL THEN
      RAISE EXCEPTION 'Jadwal event belum lengkap';
    END IF;
    IF local_time < (ev.recurring_start_time - INTERVAL '6 hours') THEN
      RAISE EXCEPTION 'Scan dibuka 6 jam sebelum acara dimulai';
    END IF;
    IF local_time > ev.recurring_end_time THEN
      RAISE EXCEPTION 'Acara hari ini sudah selesai';
    END IF;
  ELSE
    IF now() < ev.starts_at - INTERVAL '6 hours' THEN
      RAISE EXCEPTION 'Scan dibuka 6 jam sebelum acara dimulai';
    END IF;
    IF now() > COALESCE(ev.ends_at, ev.starts_at + INTERVAL '6 hours') THEN
      RAISE EXCEPTION 'Acara sudah selesai';
    END IF;
  END IF;

  INSERT INTO public.registrations(event_id, user_id)
    VALUES (evid, auth.uid())
    ON CONFLICT DO NOTHING;
  INSERT INTO public.attendance(event_id, user_id) VALUES (evid, auth.uid());
  RETURN evid;
END $function$;

-- Update find_active_event_by_program_token to allow 6 hours window
CREATE OR REPLACE FUNCTION public.find_active_event_by_program_token(_token text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.id FROM public.events e
  JOIN public.programs p ON p.id = e.program_id
  WHERE p.qr_token = _token
    AND e.status = 'active'
    AND (
      e.is_recurring = true
      OR (now() >= e.starts_at - INTERVAL '6 hours'
          AND now() <= COALESCE(e.ends_at, e.starts_at + INTERVAL '6 hours'))
    )
  ORDER BY e.is_recurring DESC, e.starts_at ASC LIMIT 1;
$function$;
