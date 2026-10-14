import {useEffect} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "./AdminLayout";
import { isExpired } from "./events/helpers";
import { CreateEvent } from "./events/CreateEvent";
import { EventList } from "./events/EventList";

export default function EventsPage() {
  const { events, programs, settings, reloadEvents } = useAdmin();

  // Auto-mark expired events as 'finished' so the lock is reflected globally
  useEffect(() => {
    const expiredActive = events.filter((e) => e.status === "active" && !e.is_recurring && isExpired(e));
    if (expiredActive.length === 0) return;
    (async () => {
      await supabase.from("events").update({ status: "finished" }).in("id", expiredActive.map((e) => e.id));
      reloadEvents();
    })();
  }, [events, reloadEvents]);

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Event</h1>
        <p className="text-sm text-muted-foreground">Buat & kelola event Teras Dakwah</p>
      </div>
      <CreateEvent programs={programs} defaultPoints={settings.default_attendance_points} onCreated={reloadEvents} />
      <EventList events={events} programs={programs} onChanged={reloadEvents} />
    </>
  );
}

