-- Lengkapi katalog tipe event tanpa mengubah nilai event lama.
-- events.event_type tetap berupa text agar kompatibilitas data lama terjaga.

CREATE OR REPLACE FUNCTION public.prevent_used_event_type_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.events WHERE event_type = OLD.value) THEN
    RAISE EXCEPTION 'Tipe event "%" sudah dipakai event dan tidak dapat dihapus. Nonaktifkan tipe tersebut.', OLD.label
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_used_event_type_delete ON public.event_types;
CREATE TRIGGER prevent_used_event_type_delete
  BEFORE DELETE ON public.event_types
  FOR EACH ROW EXECUTE FUNCTION public.prevent_used_event_type_delete();

-- Tipe bawaan yang sudah dikenal aplikasi selalu tersedia. ON CONFLICT menjaga
-- pengaturan tipe yang sudah ada dan tidak mengubah event yang telah tersimpan.
INSERT INTO public.event_types (value, label, default_registration_type, sort_order)
VALUES
  ('kajian', 'Kajian', 'free', 10),
  ('olahraga', 'Olahraga', 'paid', 20),
  ('kelas-kajian', 'Kelas Kajian', 'paid', 30),
  ('event', 'Event', 'paid', 40)
ON CONFLICT (value) DO NOTHING;

-- Masukkan nilai lama lain yang masih tersimpan di events agar dapat dikelola,
-- dengan mode paling sering dipakai sebagai default tanpa mengubah event lama.
INSERT INTO public.event_types (value, label, default_registration_type, sort_order)
SELECT legacy.event_type,
       initcap(replace(legacy.event_type, '-', ' ')),
       legacy.registration_type,
       100 + row_number() OVER (ORDER BY legacy.event_type)::integer
FROM (
  SELECT event_type,
         (array_agg(registration_type ORDER BY occurrences DESC, registration_type))[1] AS registration_type
  FROM (
    SELECT event_type, registration_type, count(*) AS occurrences
    FROM public.events
    WHERE NULLIF(btrim(event_type), '') IS NOT NULL
      AND registration_type IN ('free', 'infaq', 'paid')
    GROUP BY event_type, registration_type
  ) modes
  GROUP BY event_type
) legacy
WHERE legacy.event_type NOT IN ('kajian', 'olahraga', 'kelas-kajian', 'event')
ON CONFLICT (value) DO NOTHING;
