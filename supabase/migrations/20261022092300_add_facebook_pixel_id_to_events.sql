-- Facebook Pixel IDs are separate from the legacy Google Tag IDs.
-- Do not copy google_pixel_id values: they are not valid Facebook Pixel IDs.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS facebook_pixel_id text;

COMMENT ON COLUMN public.events.facebook_pixel_id IS
  'Optional Facebook Pixel ID used for event-page ad conversion tracking';
