CREATE OR REPLACE FUNCTION public.admin_adjust_points(
  _user_id uuid,
  _amount integer,
  _reason text DEFAULT 'admin_adjustment'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
  new_balance integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah poin';
  END IF;

  IF _amount = 0 THEN
    RAISE EXCEPTION 'Jumlah poin tidak boleh nol';
  END IF;

  SELECT points INTO current_balance
  FROM public.profiles
  WHERE id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User tidak ditemukan';
  END IF;

  new_balance := COALESCE(current_balance, 0) + _amount;
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Poin user tidak boleh kurang dari nol';
  END IF;

  UPDATE public.profiles
  SET points = new_balance
  WHERE id = _user_id;

  INSERT INTO public.point_transactions(user_id, amount, reason)
  VALUES (_user_id, _amount, COALESCE(NULLIF(_reason, ''), 'admin_adjustment'));

  RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_points(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_points(uuid, integer, text) TO authenticated;
