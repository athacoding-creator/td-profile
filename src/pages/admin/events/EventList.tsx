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
import { useAdmin } from "../AdminLayout";
import { Section } from "../components";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { isEventExpired, describeRecurring, DAY_NAMES } from "@/lib/eventSchedule";
import { buildEventQrUrl, buildProgramQrUrl } from "@/lib/qrUrl";
import { POSITION_EVENT_TYPES, EVENT_TYPE_OPTIONS, isClassEvent } from "@/lib/eventTypes";
import { localInputToISO, buildEpisodeUrls, isExpired, SPORT_EVENT_TYPES, DEFAULT_POSITIONS, DEFAULT_CLASSES, defaultRowsFor, toLocalInput } from "./helpers";
import { EpisodeFields, OnlineFields, RecurringPinFields, PaymentCategoryFields } from "./EventFormFields";
import { EditEventDialog } from "./EditEventDialog";

/** Daftar event + QR, edit, hapus. */
export function EventList({ events, programs, onChanged }: { events: any[]; programs: any[]; onChanged: () => void }) {
  const [qr, setQr] = useState<{ id: string; eventUrl: string; programUrl?: string; programName?: string } | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const showQR = async (ev: any) => {
    try {
      const { data: evToken, error: e1 } = await supabase.rpc("admin_get_event_qr", { _id: ev.id });
      if (e1) {
        console.error("[Admin QR] Error fetching event QR:", e1);
        toast.error(`Gagal mengambil QR event: ${e1?.message || "Unauthorized or token not found"}`);
        return;
      }
      if (!evToken) {
        console.error("[Admin QR] Event QR token is empty");
        toast.error("QR event tidak ditemukan atau belum di-generate");
        return;
      }
      const eventUrl = await QRCode.toDataURL(
        buildEventQrUrl(ev.id, evToken),
        { width: 400, margin: 2 },
      );
      let programUrl: string | undefined;
      if (ev.program_id) {
        const { data: progToken, error: e2 } = await supabase.rpc("admin_get_program_qr", { _id: ev.program_id });
        if (e2) {
          console.error("[Admin QR] Error fetching program QR:", e2);
          toast.warning(`Program QR tidak tersedia: ${e2?.message}`);
        }
        if (progToken) {
          programUrl = await QRCode.toDataURL(
            buildProgramQrUrl(ev.program_id, progToken),
            { width: 400, margin: 2 },
          );
        }
      }
      setQr({ id: ev.id, eventUrl, programUrl, programName: ev.programs?.name });
    } catch (err: any) {
      console.error("[Admin QR] Unexpected error:", err);
      toast.error(`Error: ${err?.message || "Failed to generate QR"}`);
    }
  };

  const remove = async (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!(await confirmDelete({ title: "Hapus event ini?", itemName: ev?.title }))) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (qr?.id === id) setQr(null);
    toast.success("Event dihapus");
    onChanged();
  };

  return (
    <Section title={`Daftar Event (${events.length})`}>
      {events.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada event.</p>
      )}
      <div className="space-y-3">
        {events.map((ev) => {
          const expired = isExpired(ev);
          return (
            <div key={ev.id} className={`rounded-xl border p-4 ${expired ? "border-destructive/40 bg-destructive/5" : "border-border/60"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-semibold flex items-center gap-2">
                    {ev.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                    {ev.title}
                    {ev.is_recurring && <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary"><Repeat className="h-3 w-3" /> Berkelanjutan</span>}
                    {expired && <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive"><Lock className="h-3 w-3" /> EVENT EXPIRED</span>}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {ev.venue} · {ev.is_recurring ? describeRecurring(ev) : new Date(ev.starts_at).toLocaleString("id-ID")}
                  </p>
                  <p className="mt-1 text-xs flex flex-wrap gap-1">
                    <span className="rounded bg-muted px-2 py-0.5">{ev.status}</span>
                    <span className="rounded bg-muted px-2 py-0.5">{ev.gender}</span>
                    <span className="rounded bg-muted px-2 py-0.5">{ev.points_reward} pts</span>
                    {ev.programs && <span className="rounded bg-accent/15 px-2 py-0.5 text-accent">{ev.programs.name}</span>}
                  </p>
                </div>
<div className="flex gap-2">
	                  <Button size="sm" variant="outline" asChild disabled={expired}>
	                    <Link to={`/admin/scan?eventId=${ev.id}`}>
	                      <Camera className="h-4 w-4 mr-1" /> Scan
	                    </Link>
	                  </Button>
	                  <Button size="sm" variant="outline" onClick={() => setEditing(ev)}><Pencil className="h-4 w-4" /></Button>
	                  <Button size="sm" variant="outline" disabled={expired} onClick={() => (qr?.id === ev.id ? setQr(null) : showQR(ev))}>
	                    <QrIcon className="h-4 w-4 mr-1" /> QR
	                  </Button>
	                  <Button size="sm" variant="outline" onClick={() => remove(ev.id)}><Trash2 className="h-4 w-4" /></Button>
	                </div>
              </div>
              {qr?.id === ev.id && !expired && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-border/60 p-3">
                    <p className="text-xs font-semibold">QR Event</p>
                    <img src={qr.eventUrl} alt="QR Event" className="rounded-lg w-full max-w-[220px]" />
                    <a href={qr.eventUrl} download={`qr-event-${ev.id}.png`} className="text-xs text-accent hover:underline">Download</a>
                  </div>
                  {qr.programUrl ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-border/60 p-3">
                      <p className="text-xs font-semibold">QR Program · {qr.programName}</p>
                      <img src={qr.programUrl} alt="QR Program" className="rounded-lg w-full max-w-[220px]" />
                      <a href={qr.programUrl} download={`qr-program-${ev.id}.png`} className="text-xs text-accent hover:underline">Download</a>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                      Event ini belum terhubung ke program
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <EditEventDialog ev={editing} programs={programs} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />
    </Section>
  );
}

