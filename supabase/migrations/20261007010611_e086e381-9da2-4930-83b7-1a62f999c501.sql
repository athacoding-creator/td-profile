CREATE OR REPLACE FUNCTION public.enforce_program_gender_registration()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  prog_gender public.gender;
  ev_gender text;
  ev RECORD;
  subject_gender public.gender;
  required text;
  ended boolean;
BEGIN
  SELECT e.gender::text AS eg, e.is_recurring, e.recurring_until, e.starts_at, e.ends_at, p.gender_restriction AS pg
    INTO ev
    FROM public.events e LEFT JOIN public.programs p ON p.id = e.program_id
    WHERE e.id = NEW.event_id;

  required := COALESCE(ev.pg::text, NULLIF(ev.eg, 'ALL'));
  IF required IS NULL THEN RETURN NEW; END IF;

  IF ev.is_recurring THEN
    ended := ev.recurring_until IS NOT NULL AND (now() AT TIME ZONE 'Asia/Jakarta')::date > ev.recurring_until;
  ELSE
    ended := now() > COALESCE(ev.ends_at, ev.starts_at + INTERVAL '6 hours');
  END IF;
  -- Setelah event selesai, semua gender boleh daftar untuk akses video rekaman
  IF ended THEN RETURN NEW; END IF;

  IF NEW.user_id IS NULL THEN
    IF NEW.guest_gender IS NULL OR NEW.guest_gender = '' THEN
      RAISE EXCEPTION 'Gender peserta wajib diisi untuk event ini';
    END IF;
    subject_gender := NEW.guest_gender::public.gender;
  ELSE
    SELECT gender INTO subject_gender FROM public.profiles WHERE id = NEW.user_id;
  END IF;

  IF subject_gender IS NULL OR subject_gender::text <> required THEN
    RAISE EXCEPTION 'Event ini khusus untuk %', CASE WHEN required = 'L' THEN 'Laki-laki' ELSE 'Perempuan' END;
  END IF;
  RETURN NEW;
END;
$function$;