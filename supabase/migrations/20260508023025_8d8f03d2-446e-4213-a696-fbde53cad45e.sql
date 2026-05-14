
CREATE TABLE public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  cta_label TEXT,
  cta_href TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY hero_public_read ON public.hero_slides FOR SELECT USING (is_active = true);
CREATE POLICY hero_admin_all ON public.hero_slides FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER hero_slides_updated_at BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public) VALUES ('hero', 'hero', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "hero images public read" ON storage.objects FOR SELECT USING (bucket_id = 'hero');
CREATE POLICY "hero admin write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hero' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "hero admin update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'hero' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "hero admin delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'hero' AND has_role(auth.uid(), 'admin'::app_role));
