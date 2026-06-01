-- Create qris storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('qris', 'qris', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for qris bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'qris' );

CREATE POLICY "Admin Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'qris' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'qris' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'qris' AND
  public.has_role(auth.uid(), 'admin')
);
