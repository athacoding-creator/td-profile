CREATE OR REPLACE FUNCTION public.validate_registration_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ev RECORD;
  pos_price numeric;
BEGIN
  SELECT registration_type, price, min_infaq, max_infaq, event_type
  INTO ev
  FROM public.events
  WHERE id = NEW.event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event tidak ditemukan: %', NEW.event_id;
  END IF;

  IF ev.event_type IN ('futsal', 'mini-soccer') AND ev.registration_type = 'paid' THEN
    IF NEW.position IS NULL OR NEW.position = '' THEN
      RAISE EXCEPTION 'Pilih posisi terlebih dahulu';
    END IF;
    SELECT price INTO pos_price
      FROM public.event_position_pricing
      WHERE event_id = NEW.event_id AND position = NEW.position AND is_active = true
      LIMIT 1;
    IF pos_price IS NULL THEN
      RAISE EXCEPTION 'Harga untuk posisi % belum diatur admin', NEW.position;
    END IF;
    IF NEW.amount_paid IS NULL OR abs(NEW.amount_paid - pos_price) > 1 THEN
      RAISE EXCEPTION 'Nominal harus sesuai harga posisi (%). Diterima: %', pos_price, NEW.amount_paid;
    END IF;
    RETURN NEW;
  END IF;

  IF ev.registration_type = 'paid' THEN
    IF NEW.amount_paid IS NULL OR abs(NEW.amount_paid - ev.price) > 1 THEN
      RAISE EXCEPTION 'Nominal harus sesuai harga event (%). Diterima: %', ev.price, NEW.amount_paid;
    END IF;
  ELSIF ev.registration_type = 'infaq' THEN
    -- Jalur "Doa terbaik": tanpa nominal, wajib ada pesan doa
    IF COALESCE(NEW.amount_paid, 0) = 0 THEN
      IF NEW.donor_message IS NULL OR btrim(NEW.donor_message) = '' THEN
        RAISE EXCEPTION 'Isi nominal infaq atau tulis doa terbaikmu.';
      END IF;
      RETURN NEW;
    END IF;
    IF NEW.amount_paid < COALESCE(ev.min_infaq, 0) THEN
      RAISE EXCEPTION 'Nominal infaq di bawah minimum (%). Diterima: %', ev.min_infaq, NEW.amount_paid;
    END IF;
    IF ev.max_infaq IS NOT NULL AND ev.max_infaq > 0 AND NEW.amount_paid > ev.max_infaq THEN
      RAISE EXCEPTION 'Nominal infaq di atas maksimum (%). Diterima: %', ev.max_infaq, NEW.amount_paid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;