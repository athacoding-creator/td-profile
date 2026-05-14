
-- Drop duplicate triggers that double-award points
DROP TRIGGER IF EXISTS attendance_award_points ON public.attendance;
DROP TRIGGER IF EXISTS profiles_check_complete ON public.profiles;

-- Drop redundant updated_at triggers (keep the *_set_updated_at versions)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
DROP TRIGGER IF EXISTS update_programs_updated_at ON public.programs;
DROP TRIGGER IF EXISTS hero_slides_updated_at ON public.hero_slides;

-- Clean duplicate point_transactions (keep oldest id per user/reason/ref/amount/created_at)
DELETE FROM public.point_transactions a
USING public.point_transactions b
WHERE a.ctid > b.ctid
  AND a.user_id = b.user_id
  AND a.reason = b.reason
  AND a.amount = b.amount
  AND a.created_at = b.created_at
  AND COALESCE(a.ref_id::text,'') = COALESCE(b.ref_id::text,'');

-- Clean duplicate attendance rows (keep earliest scanned_at per user/event)
DELETE FROM public.attendance a
USING public.attendance b
WHERE a.event_id = b.event_id
  AND a.user_id = b.user_id
  AND (a.scanned_at, a.id) > (b.scanned_at, b.id);

-- Prevent future duplicate attendance per (event,user)
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_event_user_unique;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_event_user_unique UNIQUE (event_id, user_id);

-- Recompute profile points to match the cleaned ledger
UPDATE public.profiles p
SET points = COALESCE(s.total, 0)
FROM (
  SELECT user_id, SUM(amount)::int AS total
  FROM public.point_transactions
  GROUP BY user_id
) s
WHERE p.id = s.user_id;

UPDATE public.profiles
SET points = 0
WHERE id NOT IN (SELECT user_id FROM public.point_transactions);
