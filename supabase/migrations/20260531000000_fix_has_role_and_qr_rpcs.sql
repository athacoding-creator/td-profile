-- Fix has_role function to be more flexible or consistent
-- The previous migration 20260530000000 defined it as has_role(_role, _user_id)
-- But many existing codes call it as has_role(_user_id, _role)

-- We will create an overloaded version to support both or just fix the ones that are broken.
-- Given the user's frustration, let's make it support both argument orders if possible, 
-- or at least fix the RPCs to use the correct order.

-- Re-define has_role to be consistent with the most common usage if needed, 
-- but better to just fix the callers in the same schema.

-- Let's fix the RPC functions to use the order defined in 20260530000000 (_role, _user_id)
CREATE OR REPLACE FUNCTION public.admin_get_event_qr(_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT qr_token FROM public.events
  WHERE id = _id AND public.has_role('admin'::public.app_role, auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.admin_get_program_qr(_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT qr_token FROM public.programs
  WHERE id = _id AND public.has_role('admin'::public.app_role, auth.uid());
$$;

-- Also fix other potential broken policies found in grep
-- Many policies use public.has_role(auth.uid(), 'admin')
-- We can add an overload for has_role to handle (uuid, app_role)

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- This way, both has_role('admin', uid) and has_role(uid, 'admin') will work.
