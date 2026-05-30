-- Robust fix for QR retrieval and has_role issues
-- Instead of relying on a complex has_role function that might fail due to argument order or enum casting,
-- we will use a direct check in the RPC functions for admin access.

-- First, let's make sure the user_roles table is used correctly.
-- We'll redefine the RPCs to be more direct.

CREATE OR REPLACE FUNCTION public.admin_get_event_qr(_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Check if the current user is an admin
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ) THEN
    RETURN (SELECT qr_token FROM public.events WHERE id = _id);
  ELSE
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_program_qr(_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Check if the current user is an admin
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ) THEN
    RETURN (SELECT qr_token FROM public.programs WHERE id = _id);
  ELSE
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
END;
$$;

-- Also, let's ensure has_role is as flexible as possible to avoid other breakages
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_get_event_qr(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_program_qr(uuid) TO authenticated;
