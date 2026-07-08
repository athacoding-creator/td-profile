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
import { QrCode as QrIcon, Trash2, Pencil, Lock, Pin, Repeat, Camera } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { isEventExpired, describeRecurring, DAY_NAMES } from "@/lib/eventSchedule";
import { buildEventQrUrl, buildProgramQrUrl } from "@/lib/qrUrl";

// datetime-local value -> ISO string with local timezone offset preserved
const localInputToISO = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const buildEpisodeUrls = (urls: string[] = [], count: number) => {
  const normalized = Array.isArray(urls) ? urls : [];
  return Array.from({ length: Math.max(0, count) }, (_, index) => normalized[index] || "");
};

const isExpired = (ev: any) => isEventExpired(ev);

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

function CreateEvent({ programs, defaultPoints, onCreated }: { programs: any[]; defaultPoints: number; onCreated: () => void }) {
  const [form, setForm] = useState<any>({ gender: "ALL", points_reward: defaultPoints, program_id: "", is_pinned: false, is_recurring: false, recurring_days: [], registration_type: "free", price: 0, min_infaq: 0, max_infaq: 50000, is_online: false, youtube_url: "", episode_count: 0, episode_youtube_urls: [] });
  useEffect(() => { setForm((f: any) => ({ ...f, points_reward: f.points_reward ?? defaultPoints })); }, [defaultPoints]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedProgram = programs.find((p) => p.id === form.program_id);
    const isEpisodeProgram = selectedProgram?.category === "episode";

    if (form.is_recurring && (!form.recurring_days?.length || !form.recurring_start_time || !form.recurring_end_time)) {
      return toast.error("Pilih hari & jam mulai/selesai untuk event berkelanjutan");
    }
    if (form.is_online && !isEpisodeProgram && !form.youtube_url?.trim()) {
      return toast.error("Event online wajib mengisi Link YouTube");
    }
    if (isEpisodeProgram && !form.episode_count) {
      return toast.error("Pilih jumlah episode untuk program kategori episode");
    }

    const { error } = await supabase.from("events").insert({
      title: form.title, description: form.description, venue: form.venue, city: form.city,
      poster_url: form.poster_url, event_type: form.event_type, gender: form.gender,
      starts_at: localInputToISO(form.starts_at)!, ends_at: localInputToISO(form.ends_at), group_link: form.group_link,
      points_reward: Number(form.points_reward ?? defaultPoints),
      program_id: form.program_id || null, status: "active",
      success_message: form.success_message || null,
      speaker: form.speaker || null,
      is_pinned: !!form.is_pinned,
      is_recurring: !!form.is_recurring,
      recurring_days: form.is_recurring ? (form.recurring_days ?? []) : [],
      recurring_start_time: form.is_recurring ? form.recurring_start_time : null,
      recurring_end_time: form.is_recurring ? form.recurring_end_time : null,
      recurring_until: form.is_recurring ? (form.recurring_until || null) : null,
      registration_type: form.registration_type || "free",
      price: form.registration_type === "paid" ? Number(form.price ?? 0) : 0,
      min_infaq: form.registration_type === "infaq" ? Number(form.min_infaq ?? 0) : 0,
      max_infaq: form.registration_type === "infaq" ? Number(form.max_infaq ?? 50000) : 0,
      is_online: !!form.is_online,
      youtube_url: form.is_online ? (form.youtube_url || null) : null,
      episode_count: isEpisodeProgram ? Number(form.episode_count) : 0,
      episode_youtube_urls: isEpisodeProgram ? buildEpisodeUrls(form.episode_youtube_urls ?? [], Number(form.episode_count)) : [],
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Event dibuat");
    setForm({ gender: "ALL", points_reward: defaultPoints, program_id: "", is_pinned: false, is_recurring: false, recurring_days: [], registration_type: "free", price: 0, min_infaq: 0, max_infaq: 50000, is_online: false, youtube_url: "", episode_count: 0, episode_youtube_urls: [] });
    onCreated();
  };

  return (
    <Section title="Buat Event">
      <form onSubmit={create} className="grid gap-2 sm:gap-3 md:gap-4 md:grid-cols-2">
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Judul</Label><Input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Pengisi Acara (Speaker)</Label><Input value={form.speaker ?? ""} onChange={(e) => setForm({ ...form, speaker: e.target.value })} placeholder="Contoh: Ustadz Fatih Karim" className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Program</Label>
          <select className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm" value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })}>
            <option value="">— tanpa program —</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Tipe</Label><Input value={form.event_type ?? ""} onChange={(e) => setForm({ ...form, event_type: e.target.value })} placeholder="kajian / talkshow" className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Venue</Label><Input required value={form.venue ?? ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5 md:col-span-2"><Label className="text-xs sm:text-sm">Deskripsi</Label><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-sm" /></div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Kota</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5 md:col-span-2"><Label className="text-xs sm:text-sm">Poster Event</Label><ImagePicker bucket="events" value={form.poster_url ?? ""} onChange={(url) => setForm({ ...form, poster_url: url })} /></div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Link Grup (WA/TG)</Label><Input value={form.group_link ?? ""} onChange={(e) => setForm({ ...form, group_link: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Mulai</Label><Input type="datetime-local" required value={form.starts_at ?? ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Selesai</Label><Input type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Gender Event</Label>
          <select className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="ALL">Umum</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Poin Reward</Label><Input type="number" value={form.points_reward ?? defaultPoints} onChange={(e) => setForm({ ...form, points_reward: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Tipe Pendaftaran</Label>
          <select className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm" value={form.registration_type} onChange={(e) => setForm({ ...form, registration_type: e.target.value })}>
            <option value="free">Gratis</option>
            <option value="infaq">Berinfaq</option>
            <option value="paid">Wajib Bayar</option>
          </select>
        </div>
        {form.registration_type === "paid" && (
          <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Harga (Rp)</Label><Input type="number" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        )}
        {form.registration_type === "infaq" && (
          <>
            <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Min Infaq (Rp)</Label><Input type="number" value={form.min_infaq ?? 0} onChange={(e) => setForm({ ...form, min_infaq: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
            <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Max Infaq (Rp)</Label><Input type="number" value={form.max_infaq ?? 50000} onChange={(e) => setForm({ ...form, max_infaq: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
          </>
        )}
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs sm:text-sm">Pesan Sukses (ditampilkan setelah user scan QR)</Label>
          <Textarea rows={3} placeholder="Selamat, kamu telah berhasil mendaftar! Sampai jumpa di acara 🎉" value={form.success_message ?? ""} onChange={(e) => setForm({ ...form, success_message: e.target.value })} className="text-sm" />
        </div>
        <EpisodeFields form={form} setForm={setForm} program={programs.find((p) => p.id === form.program_id)} />
        <OnlineFields form={form} setForm={setForm} program={programs.find((p) => p.id === form.program_id)} />
        <RecurringPinFields form={form} setForm={setForm} />
        <div className="md:col-span-2"><Button type="submit" className="w-full bg-primary text-primary-foreground h-9 sm:h-10 text-sm">Buat Event</Button></div>
      </form>
    </Section>
  );
}

function EpisodeFields({ form, setForm, program }: { form: any; setForm: (f: any) => void; program?: any }) {
  const isEpisodeProgram = program?.category === "episode";
  if (!isEpisodeProgram) return null;

  const updateCount = (nextCount: number) => {
    const normalized = buildEpisodeUrls(form.episode_youtube_urls ?? [], nextCount);
    setForm({ ...form, episode_count: nextCount, episode_youtube_urls: normalized });
  };

  return (
    <div className="md:col-span-2 space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
      <div className="grid gap-2 sm:gap-3 md:grid-cols-3">
        <div className="space-y-1.5 md:col-span-1">
          <Label className="text-xs sm:text-sm">Jumlah Episode</Label>
          <Input
            type="number"
            min={0}
            value={form.episode_count ?? 0}
            onChange={(e) => updateCount(Number(e.target.value))}
            className="text-sm h-9 sm:h-10"
          />
        </div>
      </div>
      {Array.from({ length: form.episode_count ?? 0 }, (_, index) => (
        <div key={index} className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Link YouTube Episode {index + 1}</Label>
          <Input
            value={form.episode_youtube_urls?.[index] ?? ""}
            onChange={(e) => {
              const nextUrls = buildEpisodeUrls(form.episode_youtube_urls ?? [], form.episode_count ?? 0);
              nextUrls[index] = e.target.value;
              setForm({ ...form, episode_youtube_urls: nextUrls });
            }}
            placeholder="https://www.youtube.com/watch?v=… atau ID"
            className="text-sm h-9 sm:h-10"
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Kosongkan episode yang belum ada tautannya. Episode tanpa link tidak akan ditampilkan di halaman detail event.
      </p>
    </div>
  );
}

function OnlineFields({ form, setForm, program }: { form: any; setForm: (f: any) => void; program?: any }) {
  const isEpisodeProgram = program?.category === "episode";

  return (
    <div className="md:col-span-2 space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
      <label className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
        <input type="checkbox" checked={!!form.is_online} onChange={(e) => setForm({ ...form, is_online: e.target.checked })} />
        <Camera className="h-4 w-4 text-primary" /> Akses Link YouTube Langsung (Tanpa Scan QR)
      </label>
      {form.is_online && !isEpisodeProgram && (
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Link YouTube</Label>
          <Input
            value={form.youtube_url ?? ""}
            onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            className="text-sm h-9 sm:h-10"
          />
        </div>
      )}
      {form.is_online && isEpisodeProgram && (
        <p className="text-xs text-muted-foreground">
          Karena ini program episode, setiap episode memiliki tautan YouTube terpisah di bawah.
        </p>
      )}
    </div>
  );
}

function RecurringPinFields({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  const toggleDay = (d: number) => {
    const cur: number[] = form.recurring_days ?? [];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort();
    setForm({ ...form, recurring_days: next });
  };

  return (
    <div className="md:col-span-2 space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
      <label className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
        <input type="checkbox" checked={!!form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />
        <Pin className="h-4 w-4 text-primary" /> Sematkan event (tampil paling depan)
      </label>
      <label className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
        <input type="checkbox" checked={!!form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} />
        <Repeat className="h-4 w-4 text-primary" /> Event berkelanjutan (mingguan, tidak expired)
      </label>
      {form.is_recurring && (
        <div className="grid gap-2 sm:gap-3 md:grid-cols-2 pl-6 pt-2">
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs sm:text-sm">Hari pelaksanaan</Label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {DAY_NAMES.map((n, i) => {
                const active = (form.recurring_days ?? []).includes(i);
                return (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-medium border transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border/60"}`}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Jam mulai</Label><Input type="time" value={form.recurring_start_time ?? ""} onChange={(e) => setForm({ ...form, recurring_start_time: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
          <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Jam selesai</Label><Input type="time" value={form.recurring_end_time ?? ""} onChange={(e) => setForm({ ...form, recurring_end_time: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
          <div className="space-y-1.5 md:col-span-2"><Label className="text-xs sm:text-sm">Berakhir pada (opsional)</Label><Input type="date" value={form.recurring_until ?? ""} onChange={(e) => setForm({ ...form, recurring_until: e.target.value })} className="text-sm h-9 sm:h-10" /><p className="text-xs text-muted-foreground">Kosongkan untuk berjalan terus tanpa batas.</p></div>
        </div>
      )}
    </div>
  );
}

function EventList({ events, programs, onChanged }: { events: any[]; programs: any[]; onChanged: () => void }) {
  const [qr, setQr] = useState<{ id: string; eventUrl: string; programUrl?: string; programName?: string } | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const showQR = async (ev: any) => {
    try {
      console.log(`[Admin QR] Fetching QR for event ${ev.id}`);
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
      console.log(`[Admin QR] Event token retrieved, generating QR image`);
      const eventUrl = await QRCode.toDataURL(
        buildEventQrUrl(ev.id, evToken),
        { width: 400, margin: 2 },
      );
      let programUrl: string | undefined;
      if (ev.program_id) {
        console.log(`[Admin QR] Fetching program QR for ${ev.program_id}`);
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
          console.log(`[Admin QR] Program QR generated successfully`);
        }
      }
      setQr({ id: ev.id, eventUrl, programUrl, programName: ev.programs?.name });
      console.log(`[Admin QR] QR display ready`);
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
      success_message: ev.success_message ?? "",
      speaker: ev.speaker ?? "",
      is_pinned: !!ev.is_pinned,
      is_recurring: !!ev.is_recurring,
      recurring_days: ev.recurring_days ?? [],
      recurring_start_time: (ev.recurring_start_time ?? "").slice(0, 5),
      recurring_end_time: (ev.recurring_end_time ?? "").slice(0, 5),
      recurring_until: ev.recurring_until ?? "",
      is_online: !!ev.is_online,
      youtube_url: ev.youtube_url ?? "",      episode_count: ev.episode_count ?? 0,
      episode_youtube_urls: ev.episode_youtube_urls ?? [],    });
  }, [ev]);

  if (!ev) return null;

  const save = async () => {
    const selectedProgram = programs.find((p) => p.id === form.program_id);
    const isEpisodeProgram = selectedProgram?.category === "episode";

    if (form.is_recurring && (!form.recurring_days?.length || !form.recurring_start_time || !form.recurring_end_time)) {
      return toast.error("Pilih hari & jam mulai/selesai untuk event berkelanjutan");
    }
    if (form.is_online && !isEpisodeProgram && !form.youtube_url?.trim()) {
      return toast.error("Event online wajib mengisi Link YouTube");
    }
    if (isEpisodeProgram && !form.episode_count) {
      return toast.error("Pilih jumlah episode untuk program kategori episode");
    }
    const { error } = await supabase.from("events").update({
      title: form.title, description: form.description, venue: form.venue, city: form.city,
      poster_url: form.poster_url, event_type: form.event_type, gender: form.gender,
      starts_at: localInputToISO(form.starts_at)!, ends_at: localInputToISO(form.ends_at), group_link: form.group_link,
      points_reward: Number(form.points_reward),
      program_id: form.program_id || null,
      status: form.status,
      success_message: form.success_message || null,
      speaker: form.speaker || null,
      is_pinned: !!form.is_pinned,
      is_recurring: !!form.is_recurring,
      recurring_days: form.is_recurring ? (form.recurring_days ?? []) : [],
      recurring_start_time: form.is_recurring ? form.recurring_start_time : null,
      recurring_end_time: form.is_recurring ? form.recurring_end_time : null,
      recurring_until: form.is_recurring ? (form.recurring_until || null) : null,
      is_online: !!form.is_online,
      youtube_url: form.is_online ? (form.youtube_url || null) : null,
      episode_count: isEpisodeProgram ? Number(form.episode_count) : 0,
      episode_youtube_urls: isEpisodeProgram ? buildEpisodeUrls(form.episode_youtube_urls ?? [], Number(form.episode_count)) : [],
    } as any).eq("id", ev.id);
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
          <div className="space-y-1.5"><Label>Pengisi Acara</Label><Input value={form.speaker ?? ""} onChange={(e) => setForm({ ...form, speaker: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Program</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.program_id ?? ""} onChange={(e) => {
              const programId = e.target.value;
              const program = programs.find((p) => p.id === programId);
              setForm({
                ...form,
                program_id: programId,
                episode_count: program?.category === "episode" ? form.episode_count : 0,
                episode_youtube_urls: program?.category === "episode" ? form.episode_youtube_urls : [],
              });
            }}>
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
          <div className="space-y-1.5 md:col-span-2">
            <Label>Pesan Sukses (ditampilkan setelah user scan QR)</Label>
            <Textarea rows={3} placeholder="Selamat, kamu telah berhasil mendaftar! Sampai jumpa di acara 🎉" value={form.success_message ?? ""} onChange={(e) => setForm({ ...form, success_message: e.target.value })} />
          </div>
          <EpisodeFields form={form} setForm={setForm} program={programs.find((p) => p.id === form.program_id)} />
          <OnlineFields form={form} setForm={setForm} program={programs.find((p) => p.id === form.program_id)} />
          <RecurringPinFields form={form} setForm={setForm} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} className="bg-primary text-primary-foreground">Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
