-- FIX for infinite recursion in user_roles RLS policy
-- The previous policy was calling a function that might trigger the policy again, or using a subquery on the same table.

-- 1. Disable RLS temporarily to ensure we can apply changes
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_user_read_own" ON public.user_roles;

-- 3. Create a more robust admin check function that uses SECURITY DEFINER 
-- and bypasses RLS by being owned by a superuser (or just by its definition)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  );
$$;

-- 4. Re-enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create new policies using a direct check that avoids recursion
-- For admin: they can do everything. We use a subquery on auth.uid() and a direct check.
-- To avoid recursion, we can use the fact that policies are not applied to the table 
-- when accessed within a SECURITY DEFINER function if handled correctly, 
-- or better, use a non-recursive logic.

CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1) = 'admin'
  );

-- Note: The above might still be recursive. The most reliable way in Supabase/Postgres 
-- to check roles without recursion is often to use a function with SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  );
END;
$$;

DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;

-- Using the SECURITY DEFINER function in the policy
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.check_is_admin());

CREATE POLICY "user_roles_user_read_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
