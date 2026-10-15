import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {Trash2, Plus} from "lucide-react";
import { Section } from "../components";
import { ImagePicker } from "@/components/admin/ImagePicker";
import {EVENT_TYPE_OPTIONS, isClassEvent} from "@/lib/eventTypes";
import {localInputToISO, buildEpisodeUrls, SPORT_EVENT_TYPES, defaultRowsFor} from "./helpers";
import { EpisodeFields, OnlineFields, RecurringPinFields, PaymentCategoryFields } from "./EventFormFields";

/** Form "Buat Event Baru". */
export function CreateEvent({ programs, defaultPoints, onCreated }: { programs: any[]; defaultPoints: number; onCreated: () => void }) {
  // fields kategori pembayaran (kelas, futsal, dll)
  const [form, setForm] = useState<any>({ gender: "ALL", points_reward: defaultPoints, program_id: "", is_pinned: false, allow_group_registration: false, is_recurring: false, recurring_days: [], registration_type: "free", price: 0, min_infaq: 0, max_infaq: 50000, max_participants: "", is_online: false, youtube_url: "", episode_count: 0, episode_youtube_urls: [], event_type: "kajian" });
  useEffect(() => { setForm((f: any) => ({ ...f, points_reward: f.points_reward ?? defaultPoints })); }, [defaultPoints]);
  const [positions, setPositions] = useState(() => defaultRowsFor("olahraga"));
  const isSportEvent = SPORT_EVENT_TYPES.includes(form.event_type);
  const isClass = isClassEvent(form.event_type);

  // Reset positions when event_type changes
  useEffect(() => {
    if (isSportEvent) {
      setPositions(defaultRowsFor(form.event_type));
    } else {
      setPositions([]);
    }
  }, [form.event_type, isSportEvent]);

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
    const validPositions = positions.filter((entry) => entry.position.trim() && Number(entry.price) > 0);
    if (isSportEvent && validPositions.length === 0) {
      return toast.error(isClass ? "Tambahkan minimal satu kelas dengan harga." : "Tambahkan minimal satu posisi dengan harga.");
    }

    const { data: createdEvent, error } = await supabase.from("events").insert({
      title: form.title, description: form.description, venue: form.venue, city: form.city,
      poster_url: form.poster_url, event_type: form.event_type, gender: form.gender,
      starts_at: localInputToISO(form.starts_at)!, ends_at: localInputToISO(form.ends_at), group_link: form.group_link,
      registration_link: form.registration_link || null,
      points_reward: Number(form.points_reward ?? defaultPoints),
      program_id: form.program_id || null, status: "active",
      success_message: form.success_message || null,
      speaker: form.speaker || null,
      is_pinned: !!form.is_pinned,
      allow_group_registration: form.allow_group_registration !== false,

      is_recurring: !!form.is_recurring,
      recurring_days: form.is_recurring ? (form.recurring_days ?? []) : [],
      recurring_start_time: form.is_recurring ? form.recurring_start_time : null,
      recurring_end_time: form.is_recurring ? form.recurring_end_time : null,
      recurring_until: form.is_recurring ? (form.recurring_until || null) : null,
      registration_type: isSportEvent ? "paid" : (form.registration_type || "free"),
      price: isSportEvent ? 0 : (form.registration_type === "paid" ? Number(form.price ?? 0) : 0),
      min_infaq: form.registration_type === "infaq" ? Number(form.min_infaq ?? 0) : 0,
      max_infaq: form.registration_type === "infaq" ? Number(form.max_infaq ?? 50000) : 0,
      max_participants: form.max_participants === "" ? null : Number(form.max_participants),
      is_online: !!form.is_online,
      youtube_url: form.is_online ? (form.youtube_url || null) : null,
      episode_count: isEpisodeProgram ? Number(form.episode_count) : 0,
      episode_youtube_urls: isEpisodeProgram ? buildEpisodeUrls(form.episode_youtube_urls ?? [], Number(form.episode_count)) : [],
      payment_category_id: form.payment_category_id || null,
      qris_method_id: form.qris_method_id || null,
      google_pixel_id: form.google_pixel_id?.trim() || null,
    } as any).select("id").single();


    if (error) return toast.error(error.message);
    if (isSportEvent && createdEvent) {
      const { error: pricingError } = await supabase.from("event_position_pricing").insert(
        validPositions.map((entry) => ({ event_id: createdEvent.id, position: entry.position.trim(), price: Number(entry.price), max_slots: entry.max_slots === "" || entry.max_slots == null ? null : Number(entry.max_slots), description: (entry.description ?? "").trim() || null }))
      );
      if (pricingError) {
        // Jangan tinggalkan event tanpa harga posisi/kelas — batalkan pembuatan event.
        await supabase.from("events").delete().eq("id", createdEvent.id);
        return toast.error(`Harga gagal disimpan, event dibatalkan: ${pricingError.message}`);
      }
    }
    toast.success("Event dibuat");
    setForm({ gender: "ALL", points_reward: defaultPoints, program_id: "", is_pinned: false, allow_group_registration: false
    , is_recurring: false, recurring_days: [], registration_type: "free", price: 0, min_infaq: 0, max_infaq: 50000, max_participants: "", is_online: false, youtube_url: "", episode_count: 0, episode_youtube_urls: [], event_type: "kajian" });
    setPositions(defaultRowsFor("olahraga"));
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
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Tipe</Label><select value={form.event_type ?? "kajian"} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm">{EVENT_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Venue</Label><Input required value={form.venue ?? ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5 md:col-span-2"><Label className="text-xs sm:text-sm">Deskripsi</Label><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-sm" /></div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Kota</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5 md:col-span-2"><Label className="text-xs sm:text-sm">Poster Event</Label><ImagePicker bucket="events" value={form.poster_url ?? ""} onChange={(url) => setForm({ ...form, poster_url: url })} /></div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Link Grup (WA/TG)</Label><Input value={form.group_link ?? ""} onChange={(e) => setForm({ ...form, group_link: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Link Pendaftaran Khusus (opsional)</Label><Input placeholder="https://forms.gle/..." value={form.registration_link ?? ""} onChange={(e) => setForm({ ...form, registration_link: e.target.value })} className="text-sm h-9 sm:h-10" /><p className="text-[11px] text-muted-foreground">Jika diisi, tombol daftar akan membuka link ini (misal Google Form) menggantikan pendaftaran di web.</p></div>
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Google Pixel / Tag ID (opsional)</Label><Input placeholder="G-XXXXXXX atau AW-XXXXXXX" value={form.google_pixel_id ?? ""} onChange={(e) => setForm({ ...form, google_pixel_id: e.target.value })} className="text-sm h-9 sm:h-10" /><p className="text-[11px] text-muted-foreground">Jika diisi, Google Tag (gtag.js) dipasang di halaman event ini untuk pelacakan iklan/analitik.</p></div>
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
        <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Max Peserta (opsional)</Label><Input type="number" min="1" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} placeholder="Tanpa batas" className="text-sm h-9 sm:h-10" /></div>
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Tipe Pendaftaran</Label>
          <select disabled={isSportEvent} className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm disabled:opacity-70" value={isSportEvent ? "paid" : form.registration_type} onChange={(e) => setForm({ ...form, registration_type: e.target.value })}>
            <option value="free">Gratis</option>
            <option value="infaq">Berinfaq</option>
            <option value="paid">Wajib Bayar</option>
          </select>
        </div>
        {form.registration_type === "paid" && !isSportEvent && (
          <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Harga (Rp)</Label><Input type="number" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
        )}
        {isSportEvent && (
          <div className="md:col-span-2 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div>
              <p className="text-sm font-semibold">{isClass ? "Daftar kelas & harga" : "Harga & kuota per posisi"}</p>
              <p className="text-xs text-muted-foreground">{isClass ? "Kelas kajian selalu wajib bayar. Kuota kosong = tanpa batas." : "Event olahraga selalu wajib bayar. Kuota kosong = tanpa batas."}</p>
            </div>
            {positions.map((entry) => <div key={entry.id} className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-2">
              <div className="grid grid-cols-[1fr_120px_100px_auto] gap-2">
                <Input value={entry.position} placeholder={isClass ? "Nama kelas" : "Nama posisi"} onChange={(e) => setPositions(positions.map((item) => item.id === entry.id ? { ...item, position: e.target.value } : item))} />
                <Input type="number" min="1" value={entry.price} placeholder="Harga" onChange={(e) => setPositions(positions.map((item) => item.id === entry.id ? { ...item, price: e.target.value } : item))} />
                <Input type="number" min="1" value={entry.max_slots ?? ""} placeholder="Kuota" onChange={(e) => setPositions(positions.map((item) => item.id === entry.id ? { ...item, max_slots: e.target.value } : item))} />
                <Button type="button" variant="outline" size="icon" disabled={positions.length === 1} onClick={() => setPositions(positions.filter((item) => item.id !== entry.id))}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {isClass && (
                <Textarea rows={2} value={entry.description ?? ""} placeholder="Benefit kelas ini (contoh: modul, sertifikat, konsumsi)" onChange={(e) => setPositions(positions.map((item) => item.id === entry.id ? { ...item, description: e.target.value } : item))} className="text-sm" />
              )}
            </div>)}
            <Button type="button" variant="outline" size="sm" onClick={() => setPositions([...positions, { id: crypto.randomUUID(), position: "", price: "", max_slots: "", description: "" }])}><Plus className="mr-1 h-4 w-4" />{isClass ? "Tambah kelas" : "Tambah posisi"}</Button>
          </div>
        )}
        <PaymentCategoryFields form={form} setForm={setForm} show={isSportEvent || form.registration_type === "paid"} />
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

