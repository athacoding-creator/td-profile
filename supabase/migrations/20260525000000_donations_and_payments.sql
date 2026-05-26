-- 1. Update events table to support donation types and pricing
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS registration_type text DEFAULT 'free' CHECK (registration_type IN ('free', 'infaq', 'paid')),
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_infaq numeric DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_infaq numeric DEFAULT 50000;

-- 2. Update registrations table to support payment tracking
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'none' CHECK (payment_status IN ('none', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS payment_proof_url text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

-- 3. Add QRIS setting to app_settings if not exists (already exists as key-value, but let's make sure we have a place for it)
-- Since app_settings is (key string, value number), we might need a new table for string settings or just use a dedicated table for QRIS
CREATE TABLE IF NOT EXISTS public.donation_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default QRIS placeholder
INSERT INTO public.donation_settings (key, value) VALUES ('qris_url', '') ON CONFLICT (key) DO NOTHING;

-- 4. Enable RLS on donation_settings
ALTER TABLE public.donation_settings ENABLE ROW LEVEL SECURITY;

-- Policies for donation_settings
CREATE POLICY "Public can view donation settings" ON public.donation_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage donation settings" ON public.donation_settings
  FOR ALL USING (public.has_role('admin', auth.uid()));

-- 5. Update record_attendance to respect payment status
-- If it's a paid or infaq event, pendaftaran must be approved first? 
-- Or let them scan but mark as attended only if paid? 
-- User said: "nanti siapa aja yg bayar dan berinfaq itu ditampilin di admin donations"
-- "admin bisa milih kalau mau lihat data orang yg bayar atau berinfaq"

-- Let's refine the record_attendance function to check for payment_status if not free
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
    IF local_time < (ev.recurring_start_time - INTERVAL '1 hour') THEN
      RAISE EXCEPTION 'Scan dibuka 1 jam sebelum acara dimulai';
    END IF;
    IF local_time > ev.recurring_end_time THEN
      RAISE EXCEPTION 'Acara hari ini sudah selesai';
    END IF;
  ELSE
    IF now() < ev.starts_at - INTERVAL '1 hour' THEN
      RAISE EXCEPTION 'Scan dibuka 1 jam sebelum acara dimulai';
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
