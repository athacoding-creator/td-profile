
REVOKE EXECUTE ON FUNCTION public.find_active_event_by_program_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_active_event_by_program_token(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_program_gender() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_old_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_old_events() TO authenticated;
