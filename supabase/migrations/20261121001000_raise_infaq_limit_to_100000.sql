-- Nominal infaq standar sekarang maksimal Rp100.000.
ALTER TABLE public.events
  ALTER COLUMN max_infaq SET DEFAULT 100000;

-- Event infaq lama yang masih memakai batas standar Rp50.000 ikut dinaikkan.
-- Nilai custom lain tidak disentuh.
UPDATE public.events
SET max_infaq = 100000
WHERE registration_type = 'infaq'
  AND (max_infaq IS NULL OR max_infaq = 50000);
