
-- 1. Restore points-awarding trigger (was accidentally dropped)
DROP TRIGGER IF EXISTS attendance_award_points ON public.attendance;
CREATE TRIGGER attendance_award_points
  BEFORE INSERT ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.award_attendance_points();

-- 2. Restore profile-complete bonus trigger
DROP TRIGGER IF EXISTS profiles_check_complete ON public.profiles;
CREATE TRIGGER profiles_check_complete
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_complete();

-- 3. Tighten attendance insert policy (user must send points_awarded=0; trigger sets real value)
DROP POLICY IF EXISTS att_insert_own ON public.attendance;
CREATE POLICY att_insert_own ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND points_awarded = 0);

-- 4. Server-side redemption validation
CREATE OR REPLACE FUNCTION public.process_redemption()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; balance INTEGER;
BEGIN
  SELECT cost_points, stock, is_active INTO r FROM public.rewards WHERE id = NEW.reward_id;
  IF NOT FOUND OR NOT r.is_active THEN RAISE EXCEPTION 'Reward tidak tersedia'; END IF;
  IF r.stock < 1 THEN RAISE EXCEPTION 'Stok habis'; END IF;
  NEW.cost_points := r.cost_points;
  NEW.status := 'pending';
  SELECT points INTO balance FROM public.profiles WHERE id = NEW.user_id;
  IF COALESCE(balance, 0) < r.cost_points THEN RAISE EXCEPTION 'Poin tidak cukup'; END IF;
  UPDATE public.profiles SET points = points - r.cost_points WHERE id = NEW.user_id;
  UPDATE public.rewards SET stock = stock - 1 WHERE id = NEW.reward_id;
  INSERT INTO public.point_transactions(user_id, amount, reason, ref_id)
    VALUES (NEW.user_id, -r.cost_points, 'redeem', NEW.reward_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS redemptions_process ON public.redemptions;
CREATE TRIGGER redemptions_process
  BEFORE INSERT ON public.redemptions
  FOR EACH ROW EXECUTE FUNCTION public.process_redemption();

-- Tighten redemption insert policy
DROP POLICY IF EXISTS red_insert_own ON public.redemptions;
CREATE POLICY red_insert_own ON public.redemptions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND cost_points = (SELECT cost_points FROM public.rewards WHERE id = reward_id)
  );

-- 5. Restrict qr_token column visibility to non-admin clients
REVOKE SELECT (qr_token) ON public.events FROM anon, authenticated;
REVOKE SELECT (qr_token) ON public.programs FROM anon, authenticated;

-- Admin getters
CREATE OR REPLACE FUNCTION public.admin_get_event_qr(_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT qr_token FROM public.events
  WHERE id = _id AND public.has_role(auth.uid(), 'admin');
$$;
REVOKE EXECUTE ON FUNCTION public.admin_get_event_qr(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.admin_get_program_qr(_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT qr_token FROM public.programs
  WHERE id = _id AND public.has_role(auth.uid(), 'admin');
$$;
REVOKE EXECUTE ON FUNCTION public.admin_get_program_qr(uuid) FROM anon;

-- 6. User attendance via SECURITY DEFINER RPC (validates token server-side, no qr_token exposure)
CREATE OR REPLACE FUNCTION public.record_attendance(_event_id uuid, _token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  INSERT INTO public.attendance(event_id, user_id) VALUES (evid, auth.uid());
  RETURN evid;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_attendance(uuid, text) FROM anon;

-- 7. Drop plaintext password column (message field already contains the credential for admin outbox)
ALTER TABLE public.password_resets DROP COLUMN IF EXISTS new_password;
