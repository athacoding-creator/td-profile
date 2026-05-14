import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { Download, QrCode as QrIcon, Trash2, Pencil, Lock } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";
import { ImagePicker } from "@/components/admin/ImagePicker";

// datetime-local value -> ISO string with local timezone offset preserved
const localInputToISO = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const isExpired = (ev: any) => {
  const end = ev.ends_at ? new Date(ev.ends_at) : new Date(new Date(ev.starts_at).getTime() + 6 * 3600 * 1000);
  return Date.now() > end.getTime();
};

const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function EventsPage() {
  const { events, programs, settings, reloadEvents } = useAdmin();

  // Auto-mark expired events as 'finished' so the lock is reflected globally
  useEffect(() => {
    const expiredActive = events.filter((e) => e.status === "active" && isExpired(e));
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

function CreateEvent({ programs, defaultPoints, onCreated }: { programs: any[]; defaultPoints: number; onCreated: () => void }) {
  const [form, setForm] = useState<any>({ gender: "ALL", points_reward: defaultPoints, program_id: "" });
  useEffect(() => { setForm((f: any) => ({ ...f, points_reward: f.points_reward ?? defaultPoints })); }, [defaultPoints]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("events").insert({
      title: form.title, description: form.description, venue: form.venue, city: form.city,
      poster_url: form.poster_url, event_type: form.event_type, gender: form.gender,
      starts_at: localInputToISO(form.starts_at)!, ends_at: localInputToISO(form.ends_at), group_link: form.group_link,
      points_reward: Number(form.points_reward ?? defaultPoints),
      program_id: form.program_id || null, status: "active",
    });
    if (error) return toast.error(error.message);
    toast.success("Event dibuat");
    setForm({ gender: "ALL", points_reward: defaultPoints, program_id: "" });
    onCreated();
  };

  return (
    <Section title="Buat Event">
      <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5"><Label>Judul</Label><Input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>Program</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })}>
            <option value="">— tanpa program —</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label>Tipe</Label><Input value={form.event_type ?? ""} onChange={(e) => setForm({ ...form, event_type: e.target.value })} placeholder="kajian / talkshow" /></div>
        <div className="space-y-1.5"><Label>Venue</Label><Input required value={form.venue ?? ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Deskripsi</Label><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Kota</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Poster Event</Label><ImagePicker bucket="events" value={form.poster_url ?? ""} onChange={(url) => setForm({ ...form, poster_url: url })} /></div>
        <div className="space-y-1.5"><Label>Link Grup (WA/TG)</Label><Input value={form.group_link ?? ""} onChange={(e) => setForm({ ...form, group_link: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Mulai</Label><Input type="datetime-local" required value={form.starts_at ?? ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Selesai</Label><Input type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>Gender Event</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="ALL">Umum</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div className="space-y-1.5"><Label>Poin Reward</Label><Input type="number" value={form.points_reward ?? defaultPoints} onChange={(e) => setForm({ ...form, points_reward: e.target.value })} /></div>
        <div className="md:col-span-2"><Button type="submit" className="w-full bg-primary text-primary-foreground">Buat Event</Button></div>
      </form>
    </Section>
  );
}

function EventList({ events, programs, onChanged }: { events: any[]; programs: any[]; onChanged: () => void }) {
  const [qr, setQr] = useState<{ id: string; eventUrl: string; programUrl?: string; programName?: string } | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const showQR = async (ev: any) => {
    const eventUrl = await QRCode.toDataURL(ev.qr_token, { width: 400, margin: 2 });
    let programUrl: string | undefined;
    if (ev.programs?.qr_token) {
      programUrl = await QRCode.toDataURL(ev.programs.qr_token, { width: 400, margin: 2 });
    }
    setQr({ id: ev.id, eventUrl, programUrl, programName: ev.programs?.name });
  };

  const exportXLSX = async (ev: any) => {
    const { data } = await supabase.from("registrations")
      .select("created_at, user_id, profiles(full_name, phone, gender, city)").eq("event_id", ev.id)
      .order("created_at", { ascending: true });
    const { data: att } = await supabase.from("attendance")
      .select("scanned_at, user_id").eq("event_id", ev.id);
    const attendedMap = new Map((att ?? []).map((a: any) => [a.user_id, a.scanned_at]));

    // Sheet 1 — Info Event
    const wb = XLSX.utils.book_new();
    const infoRows = [
      { Field: "Judul Event", Value: ev.title },
      { Field: "Venue", Value: ev.venue ?? "-" },
      { Field: "Program", Value: ev.programs?.name ?? "-" },
      { Field: "Mulai", Value: new Date(ev.starts_at).toLocaleString("id-ID") },
      { Field: "Selesai", Value: ev.ends_at ? new Date(ev.ends_at).toLocaleString("id-ID") : "-" },
      { Field: "Total Pendaftar", Value: (data ?? []).length },
      { Field: "Total Hadir", Value: attendedMap.size },
    ];
    const wsInfo = XLSX.utils.json_to_sheet(infoRows);
    wsInfo["!cols"] = [{ wch: 18 }, { wch: 44 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, "Info Event");

    // Sheet 2 — Peserta per akun (format rapi)
    const rows = (data ?? []).map((r: any, i: number) => {
      const scannedAt = attendedMap.get(r.user_id);
      return {
        No: i + 1,
        "Tanggal Daftar": new Date(r.created_at).toLocaleString("id-ID"),
        Nama: r.profiles?.full_name ?? "-",
        "No. WhatsApp": r.profiles?.phone ?? "-",
        Gender: r.profiles?.gender === "L" ? "Laki-laki" : r.profiles?.gender === "P" ? "Perempuan" : (r.profiles?.gender ?? "-"),
        Kota: r.profiles?.city ?? "-",
        Hadir: scannedAt ? "Ya" : "Tidak",
        "Waktu Hadir": scannedAt ? new Date(scannedAt).toLocaleString("id-ID") : "-",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 },   // No
      { wch: 22 },  // Tanggal Daftar
      { wch: 28 },  // Nama
      { wch: 18 },  // No. WhatsApp
      { wch: 12 },  // Gender
      { wch: 18 },  // Kota
      { wch: 8 },   // Hadir
      { wch: 22 },  // Waktu Hadir
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Peserta");

    const safe = (ev.title || "event").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
    XLSX.writeFile(wb, `peserta-${safe}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus event?")) return;
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
                    {ev.title}
                    {expired && <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive"><Lock className="h-3 w-3" /> EVENT EXPIRED</span>}
                  </h3>
                  <p className="text-xs text-muted-foreground">{ev.venue} · {new Date(ev.starts_at).toLocaleString("id-ID")}</p>
                  <p className="mt-1 text-xs flex flex-wrap gap-1">
                    <span className="rounded bg-muted px-2 py-0.5">{ev.status}</span>
                    <span className="rounded bg-muted px-2 py-0.5">{ev.gender}</span>
                    <span className="rounded bg-muted px-2 py-0.5">{ev.points_reward} pts</span>
                    {ev.programs && <span className="rounded bg-accent/15 px-2 py-0.5 text-accent">{ev.programs.name}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(ev)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" disabled={expired} onClick={() => (qr?.id === ev.id ? setQr(null) : showQR(ev))}>
                    <QrIcon className="h-4 w-4 mr-1" /> QR
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportXLSX(ev)}><Download className="h-4 w-4" /></Button>
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

function EditEventDialog({ ev, programs, onClose, onSaved }: { ev: any | null; programs: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (!ev) return;
    setForm({
      title: ev.title ?? "",
      description: ev.description ?? "",
      venue: ev.venue ?? "",
      city: ev.city ?? "",
      poster_url: ev.poster_url ?? "",
      event_type: ev.event_type ?? "",
      gender: ev.gender ?? "ALL",
      starts_at: toLocalInput(ev.starts_at),
      ends_at: toLocalInput(ev.ends_at),
      group_link: ev.group_link ?? "",
      points_reward: ev.points_reward ?? 10,
      program_id: ev.program_id ?? "",
      status: ev.status ?? "active",
    });
  }, [ev]);

  if (!ev) return null;

  const save = async () => {
    const { error } = await supabase.from("events").update({
      title: form.title, description: form.description, venue: form.venue, city: form.city,
      poster_url: form.poster_url, event_type: form.event_type, gender: form.gender,
      starts_at: localInputToISO(form.starts_at)!, ends_at: localInputToISO(form.ends_at), group_link: form.group_link,
      points_reward: Number(form.points_reward),
      program_id: form.program_id || null,
      status: form.status,
    }).eq("id", ev.id);
    if (error) return toast.error(error.message);
    toast.success("Event diperbarui");
    onSaved();
  };

  return (
    <Dialog open={!!ev} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Judul</Label><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Program</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.program_id ?? ""} onChange={(e) => setForm({ ...form, program_id: e.target.value })}>
              <option value="">— tanpa program —</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Tipe</Label><Input value={form.event_type ?? ""} onChange={(e) => setForm({ ...form, event_type: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Venue</Label><Input value={form.venue ?? ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Deskripsi</Label><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Kota</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Poster Event</Label><ImagePicker bucket="events" value={form.poster_url ?? ""} onChange={(url) => setForm({ ...form, poster_url: url })} /></div>
          <div className="space-y-1.5"><Label>Link Grup</Label><Input value={form.group_link ?? ""} onChange={(e) => setForm({ ...form, group_link: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Mulai</Label><Input type="datetime-local" value={form.starts_at ?? ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Selesai</Label><Input type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.gender ?? "ALL"} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="ALL">Umum</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label>Poin Reward</Label><Input type="number" value={form.points_reward ?? 0} onChange={(e) => setForm({ ...form, points_reward: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status ?? "active"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">active</option>
              <option value="finished">finished</option>
              <option value="archived">archived</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} className="bg-primary text-primary-foreground">Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
