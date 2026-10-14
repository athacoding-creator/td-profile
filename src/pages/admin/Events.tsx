import { confirmDelete } from "@/lib/confirmDelete";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import QRCode from "qrcode";
import { QrCode as QrIcon, Trash2, Pencil, Lock, Pin, Repeat, Camera, Plus, Users } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { isEventExpired, describeRecurring, DAY_NAMES } from "@/lib/eventSchedule";
import { buildEventQrUrl, buildProgramQrUrl } from "@/lib/qrUrl";
import { POSITION_EVENT_TYPES, EVENT_TYPE_OPTIONS, isClassEvent } from "@/lib/eventTypes";
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

