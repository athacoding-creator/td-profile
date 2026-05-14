CREATE OR REPLACE FUNCTION public.check_profile_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE complete BOOLEAN;
BEGIN
  complete := (NEW.full_name IS NOT NULL AND NEW.gender IS NOT NULL AND NEW.phone IS NOT NULL
               AND NEW.city IS NOT NULL AND NEW.birth_date IS NOT NULL AND NEW.address IS NOT NULL);
  NEW.is_complete := complete;
  IF complete AND NOT COALESCE(OLD.bonus_awarded, false) THEN
    NEW.bonus_awarded := true;
    NEW.points := COALESCE(NEW.points,0) + 50;
    INSERT INTO public.point_transactions(user_id, amount, reason) VALUES (NEW.id, 50, 'profile_complete_bonus');
  END IF;
  RETURN NEW;
END $function$;