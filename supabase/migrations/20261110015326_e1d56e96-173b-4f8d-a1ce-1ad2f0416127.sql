DROP POLICY IF EXISTS "events_public_read" ON public.events;
CREATE POLICY "events_public_read"
ON public.events
FOR SELECT
USING (
  status IN ('active'::public.event_status, 'finished'::public.event_status)
  OR (
    status = 'archived'::public.event_status
    AND EXISTS (
      SELECT 1
      FROM public.programs AS curriculum_program
      WHERE curriculum_program.id = events.program_id
        AND curriculum_program.category = 'episode'
    )
  )
);