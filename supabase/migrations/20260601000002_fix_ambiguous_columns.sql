-- Fix for ambiguous column error (code 42702)
-- This migration ensures all role-related functions and policies use table aliases to avoid ambiguity.

-- 1. Redefine has_role with aliases to avoid column ambiguity
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = _role);
$$;

-- 2. Redefine check_is_admin with aliases
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  );
END;
$$;

-- 3. Redefine is_admin with aliases
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  );
$$;

-- 4. Clean up and redefine user_roles policies to be non-recursive and non-ambiguous
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_user_read_own" ON public.user_roles;

CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.check_is_admin());

CREATE POLICY "user_roles_user_read_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. Fix storage policies for qris bucket to be more explicit and use robust check
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'qris' );

CREATE POLICY "Admin Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'qris' AND
  public.check_is_admin()
);

CREATE POLICY "Admin Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'qris' AND
  public.check_is_admin()
);

CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'qris' AND
  public.check_is_admin()
);

-- 6. Fix qris_methods policy
DROP POLICY IF EXISTS "Admins can manage QRIS methods" ON public.qris_methods;
CREATE POLICY "Admins can manage QRIS methods" ON public.qris_methods
  FOR ALL TO authenticated
  USING (public.check_is_admin());

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
