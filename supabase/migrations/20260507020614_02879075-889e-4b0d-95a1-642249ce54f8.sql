INSERT INTO storage.buckets (id, name, public)
VALUES ('merchandise', 'merchandise', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "merch_public_read" ON storage.objects;
CREATE POLICY "merch_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'merchandise');

DROP POLICY IF EXISTS "merch_admin_insert" ON storage.objects;
CREATE POLICY "merch_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'merchandise' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "merch_admin_update" ON storage.objects;
CREATE POLICY "merch_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'merchandise' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "merch_admin_delete" ON storage.objects;
CREATE POLICY "merch_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'merchandise' AND public.has_role(auth.uid(), 'admin'::app_role));