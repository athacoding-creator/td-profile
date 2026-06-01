-- Create qris_methods table to store multiple QRIS codes
CREATE TABLE IF NOT EXISTS public.qris_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  qr_url text NOT NULL,
  category text NOT NULL CHECK (category IN ('paid', 'infaq')),
  is_active boolean DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on qris_methods
ALTER TABLE public.qris_methods ENABLE ROW LEVEL SECURITY;

-- Policies for qris_methods
CREATE POLICY "Public can view active QRIS methods" ON public.qris_methods
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage QRIS methods" ON public.qris_methods
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_qris_methods_category ON public.qris_methods(category);
CREATE INDEX idx_qris_methods_is_active ON public.qris_methods(is_active);
