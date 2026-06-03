ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS attendance_mode text DEFAULT 'offline' CHECK (attendance_mode IN ('online', 'offline'));
