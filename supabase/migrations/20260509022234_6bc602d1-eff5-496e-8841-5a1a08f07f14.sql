
-- 1. Attach handle_new_user trigger (creates profile + role on signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill missing profiles for existing auth users
INSERT INTO public.profiles (id, email, full_name, phone)
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'phone'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id);

-- 3. Profile completeness + bonus on update
DROP TRIGGER IF EXISTS profiles_check_complete ON public.profiles;
CREATE TRIGGER profiles_check_complete
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_profile_complete();

-- 4. updated_at triggers
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS events_set_updated_at ON public.events;
CREATE TRIGGER events_set_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS programs_set_updated_at ON public.programs;
CREATE TRIGGER programs_set_updated_at
BEFORE UPDATE ON public.programs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS hero_set_updated_at ON public.hero_slides;
CREATE TRIGGER hero_set_updated_at
BEFORE UPDATE ON public.hero_slides
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Attendance points awarder
DROP TRIGGER IF EXISTS attendance_award_points ON public.attendance;
CREATE TRIGGER attendance_award_points
BEFORE INSERT ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.award_attendance_points();

-- 6. Gender enforcement on registrations
DROP TRIGGER IF EXISTS registrations_enforce_gender ON public.registrations;
CREATE TRIGGER registrations_enforce_gender
BEFORE INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.enforce_program_gender();

-- 7. Storage bucket for event posters
INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Storage policies for events bucket (public read, admin write)
DROP POLICY IF EXISTS "events_public_read" ON storage.objects;
CREATE POLICY "events_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'events');

DROP POLICY IF EXISTS "events_admin_insert" ON storage.objects;
CREATE POLICY "events_admin_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'events' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "events_admin_update" ON storage.objects;
CREATE POLICY "events_admin_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'events' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "events_admin_delete" ON storage.objects;
CREATE POLICY "events_admin_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'events' AND public.has_role(auth.uid(), 'admin'));
