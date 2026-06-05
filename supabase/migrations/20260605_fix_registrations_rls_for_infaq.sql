-- Fix: Add RLS policy to allow users to update their own registrations
-- This is needed for the "Doa Terbaik" (prayer-only) submission to work
-- Previously, only admins could update registrations, blocking user prayer submissions

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "reg_insert_own" ON public.registrations;
DROP POLICY IF EXISTS "reg_update_own" ON public.registrations;
DROP POLICY IF EXISTS "reg_select_own" ON public.registrations;

-- Create policies that allow users to manage their own registrations
CREATE POLICY "reg_insert_own" ON public.registrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reg_update_own" ON public.registrations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reg_select_own" ON public.registrations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.created_by = auth.uid()
  ));
