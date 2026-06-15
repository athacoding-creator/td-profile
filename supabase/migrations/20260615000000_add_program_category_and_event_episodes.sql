-- Add program categories and event episode support
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'single';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS episode_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS episode_youtube_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
