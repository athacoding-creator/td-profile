-- 1) Bersihkan baris yatim sebelum menambahkan FK
DELETE FROM public.registrations r
  WHERE NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = r.event_id)
     OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = r.user_id);

DELETE FROM public.attendance a
  WHERE NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = a.event_id)
     OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = a.user_id);

DELETE FROM public.redemptions x
  WHERE NOT EXISTS (SELECT 1 FROM public.rewards r WHERE r.id = x.reward_id)
     OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = x.user_id);

DELETE FROM public.point_transactions t
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.user_id);

DELETE FROM public.login_events l
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = l.user_id);

UPDATE public.events SET program_id = NULL
  WHERE program_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.programs p WHERE p.id = events.program_id);

-- 2) Tambah FK (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='events_program_id_fkey') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='events_created_by_fkey') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='login_events_user_id_fkey') THEN
    ALTER TABLE public.login_events ADD CONSTRAINT login_events_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='registrations_user_id_fkey') THEN
    ALTER TABLE public.registrations ADD CONSTRAINT registrations_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='registrations_event_id_fkey') THEN
    ALTER TABLE public.registrations ADD CONSTRAINT registrations_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='registrations_user_event_uniq') THEN
    ALTER TABLE public.registrations ADD CONSTRAINT registrations_user_event_uniq UNIQUE (user_id, event_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='attendance_user_id_fkey') THEN
    ALTER TABLE public.attendance ADD CONSTRAINT attendance_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='attendance_event_id_fkey') THEN
    ALTER TABLE public.attendance ADD CONSTRAINT attendance_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='redemptions_user_id_fkey') THEN
    ALTER TABLE public.redemptions ADD CONSTRAINT redemptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='redemptions_reward_id_fkey') THEN
    ALTER TABLE public.redemptions ADD CONSTRAINT redemptions_reward_id_fkey
      FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='point_transactions_user_id_fkey') THEN
    ALTER TABLE public.point_transactions ADD CONSTRAINT point_transactions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';