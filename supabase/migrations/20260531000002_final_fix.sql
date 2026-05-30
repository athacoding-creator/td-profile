-- FINAL FIX for QR retrieval and blank screen issues
-- This script ensures all role-related functions and RPCs are robust and consistent.

-- 1. Ensure app_role enum exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Ensure user_roles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 3. Overload has_role to support both argument orders
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- 4. Redefine QR RPCs to be extremely robust
-- Using SECURITY DEFINER and explicit search_path to bypass RLS and avoid path issues
CREATE OR REPLACE FUNCTION public.admin_get_event_qr(_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _qr_token text;
BEGIN
  -- Direct check for admin role to avoid any has_role recursion or ambiguity
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ) THEN
    SELECT qr_token INTO _qr_token FROM public.events WHERE id = _id;
    RETURN _qr_token;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_program_qr(_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _qr_token text;
BEGIN
  -- Direct check for admin role
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ) THEN
    SELECT qr_token INTO _qr_token FROM public.programs WHERE id = _id;
    RETURN _qr_token;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
END;
$$;

-- 5. Fix RLS on user_roles to prevent infinite recursion if has_role is used
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_user_read_own" ON public.user_roles;

-- Use a direct subquery for admin check in policies to avoid calling has_role which might call the policy
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  );

CREATE POLICY "user_roles_user_read_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.admin_get_event_qr(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_program_qr(uuid) TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
