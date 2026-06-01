-- 1. Setup storage for payment proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment_proofs', 'payment_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for payment_proofs
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'payment_proofs');
CREATE POLICY "Authenticated users can upload proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment_proofs' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own proofs" ON storage.objects FOR UPDATE USING (bucket_id = 'payment_proofs' AND auth.uid() = owner);

-- 2. Add chat template to donation_settings
INSERT INTO public.donation_settings (key, value) 
VALUES ('wa_verification_template', 'Halo Admin, saya sudah melakukan pembayaran untuk event {{event_title}}. Berikut bukti pembayarannya. Mohon bantuannya untuk diverifikasi. Terima kasih.')
ON CONFLICT (key) DO NOTHING;

-- 3. Add admin WhatsApp number to donation_settings
INSERT INTO public.donation_settings (key, value)
VALUES ('admin_wa_number', '6285111514040')
ON CONFLICT (key) DO NOTHING;
