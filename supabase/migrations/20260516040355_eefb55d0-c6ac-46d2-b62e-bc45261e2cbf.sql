-- 1. Wipe all existing user data (cascade-style manual cleanup)
TRUNCATE TABLE public.login_events, public.point_transactions, public.redemptions, public.registrations, public.attendance, public.user_roles, public.profiles RESTART IDENTITY CASCADE;
DELETE FROM auth.users;

-- 2. Make profiles.phone unique and required (will apply after wipe)
ALTER TABLE public.profiles ALTER COLUMN phone SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles(phone);

-- 3. Update handle_new_user to ensure phone is always stored
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- 4. Ensure trigger exists on auth.users (in case it was missing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Password reset audit/queue table (also used as fallback "outbox" while WA gateway not configured)
CREATE TABLE IF NOT EXISTS public.password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  new_password text NOT NULL,
  message text,
  delivered boolean NOT NULL DEFAULT false,
  delivery_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_admin_select" ON public.password_resets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Seed admin user (phone 6285111514040, pw admin12345)
DO $$
DECLARE
  new_uid uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_uid,
    'authenticated',
    'authenticated',
    '6285111514040@wa.tdprofile.local',
    crypt('admin12345', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin","phone":"6285111514040"}'::jsonb,
    now(), now(), '', '', '', ''
  );
  -- trigger creates profile + user role; elevate to admin
  UPDATE public.user_roles SET role = 'admin' WHERE user_id = new_uid;
END $$;