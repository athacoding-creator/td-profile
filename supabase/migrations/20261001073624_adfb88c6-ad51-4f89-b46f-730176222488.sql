CREATE TABLE public.sheet_sync_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  spreadsheet_id text,
  last_synced_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sheet_sync_config TO service_role;
ALTER TABLE public.sheet_sync_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.sheet_sync_config (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule('sync-sheets-hourly', '0 * * * *', $$
  SELECT net.http_post(
    url := 'https://xzkoxpgsdzbmqxbiyuqh.supabase.co/functions/v1/sync-sheets',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6a294cGdzZHpibXF4Yml5dXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwOTkzMjEsImV4cCI6MjA5MzY3NTMyMX0.WkyBppjSZCgArFyq7dF4HkQ-Hkksha7zeT0yu2wo8Xk"}'::jsonb,
    body := '{"action":"cron"}'::jsonb
  );
$$);