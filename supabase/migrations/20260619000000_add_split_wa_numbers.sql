-- Add split admin WhatsApp numbers for paid and infaq/free events
INSERT INTO public.donation_settings (key, value)
VALUES 
  ('admin_wa_number_paid', '082136031995'),
  ('admin_wa_number_infaq', '085171577665')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
