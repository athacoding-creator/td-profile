ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS donor_message text;

ALTER TABLE public.registrations
  DROP CONSTRAINT IF EXISTS registrations_donor_message_length;
ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_donor_message_length
  CHECK (donor_message IS NULL OR char_length(donor_message) <= 500);

CREATE OR REPLACE FUNCTION public.get_event_donors(_event_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  amount_paid integer,
  donor_message text,
  paid_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    COALESCE(p.full_name, 'Hamba Allah') AS full_name,
    r.amount_paid,
    r.donor_message,
    COALESCE(r.paid_at, r.created_at) AS paid_at
  FROM public.registrations r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.event_id = _event_id
    AND COALESCE(r.amount_paid, 0) > 0
  ORDER BY r.amount_paid DESC NULLS LAST, COALESCE(r.paid_at, r.created_at) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_donors(uuid) TO anon, authenticated;