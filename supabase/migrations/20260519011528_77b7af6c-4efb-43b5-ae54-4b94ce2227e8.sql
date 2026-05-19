-- Deduplicate existing rows first
DELETE FROM public.registrations a
USING public.registrations b
WHERE a.ctid < b.ctid
  AND a.event_id = b.event_id
  AND a.user_id = b.user_id;

ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_event_user_unique UNIQUE (event_id, user_id);