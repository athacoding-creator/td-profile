-- Grant admin role to the specific user ID
-- This script ensures the user dc14d05b-d06c-48c1-b52b-cb8004a3afa5 has the 'admin' role.

-- 1. Insert the role if it doesn't exist
INSERT INTO public.user_roles (user_id, role)
VALUES ('dc14d05b-d06c-48c1-b52b-cb8004a3afa5', 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Verify (this is just for documentation, as SQL doesn't output directly to user here)
-- SELECT * FROM public.user_roles WHERE user_id = 'dc14d05b-d06c-48c1-b52b-cb8004a3afa5';
