-- Fix payment_proofs bucket and storage policies
-- The previous migration had policy name conflicts with qris bucket policies
-- This migration ensures payment_proofs bucket exists with unique, non-conflicting policies

-- 1. Ensure payment_proofs bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment_proofs', 'payment_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop conflicting policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own proofs" ON storage.objects;

-- 3. Create unique, non-conflicting policies for payment_proofs bucket
CREATE POLICY "payment_proofs_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment_proofs');

CREATE POLICY "payment_proofs_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment_proofs' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "payment_proofs_user_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment_proofs' AND 
  auth.uid() = owner
);

-- 4. Recreate qris bucket policies with unique names to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

CREATE POLICY "qris_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'qris');

CREATE POLICY "qris_admin_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'qris' AND
  public.check_is_admin()
);

CREATE POLICY "qris_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'qris' AND
  public.check_is_admin()
);

CREATE POLICY "qris_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'qris' AND
  public.check_is_admin()
);
