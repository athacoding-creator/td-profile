import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {Trash2, Plus} from "lucide-react";
import { ImagePicker } from "@/components/admin/ImagePicker";
import {EVENT_TYPE_OPTIONS, isClassEvent} from "@/lib/eventTypes";
import {localInputToISO, buildEpisodeUrls, SPORT_EVENT_TYPES, defaultRowsFor, toLocalInput} from "./helpers";
import { EpisodeFields, OnlineFields, RecurringPinFields, PaymentCategoryFields } from "./EventFormFields";

/** Dialog edit event. */
export function EditEventDialog({ ev, programs, onClose, onSaved }: { ev: any | null; programs: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({});
  const [positions, setPositions] = useState<any[]>([]);
  const isSportEvent = SPORT_EVENT_TYPES.includes(form.event_type);
  const isClass = isClassEvent(form.event_type);

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
      registration_link: ev.registration_link ?? "",
      facebook_pixel_id: ev.facebook_pixel_id ?? "",
      points_reward: ev.points_reward ?? 10,
      program_id: ev.program_id ?? "",
      status: ev.status ?? "active",
      success_message: ev.success_message ?? "",
      speaker: ev.speaker ?? "",
      max_participants: ev.max_participants ?? "",
      is_pinned: !!ev.is_pinned,
      allow_group_registration: ev.allow_group_registration !== false,
      is_recurring: !!ev.is_recurring,
      recurring_days: ev.recurring_days ?? [],
      recurring_start_time: (ev.recurring_start_time ?? "").slice(0, 5),
      recurring_end_time: (ev.recurring_end_time ?? "").slice(0, 5),
      recurring_until: ev.recurring_until ?? "",
      is_online: !!ev.is_online,
      youtube_url: ev.youtube_url ?? "",
      episode_count: ev.episode_count ?? 0,
      episode_youtube_urls: ev.episode_youtube_urls ?? [],
      registration_type: ev.registration_type ?? "free",
      payment_category_id: ev.payment_category_id ?? "",
      qris_method_id: ev.qris_method_id ?? "",
    });

    if (SPORT_EVENT_TYPES.includes(ev.event_type)) {
      (async () => {
        const { data } = await supabase.from("event_position_pricing").select("*").eq("event_id", ev.id).eq("is_active", true).order("created_at");
        if (data && data.length > 0) {
          setPositions(data.map((p: any) => ({ ...p, price: String(p.price), max_slots: p.max_slots == null ? "" : String(p.max_slots), description: p.description ?? "" })));
        } else {
          setPositions(defaultRowsFor(ev.event_type));
        }
      })();
    }
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

    const validPositions = positions.filter((entry) => entry.position.trim() && Number(entry.price) > 0);
    if (isSportEvent && validPositions.length === 0) {
      return toast.error("Tambahkan minimal satu posisi dengan harga.");
    }

    const { error } = await supabase.from("events").update({
      title: form.title, description: form.description, venue: form.venue, city: form.city,
      poster_url: form.poster_url, event_type: form.event_type, gender: form.gender,
      starts_at: localInputToISO(form.starts_at)!, ends_at: localInputToISO(form.ends_at), group_link: form.group_link,
      registration_link: form.registration_link || null,
      facebook_pixel_id: form.facebook_pixel_id?.trim() || null,
      points_reward: Number(form.points_reward),
      max_participants: form.max_participants === "" ? null : Number(form.max_participants),
      program_id: form.program_id || null,
      status: form.status,
      success_message: form.success_message || null,
      speaker: form.speaker || null,
      is_pinned: !!form.is_pinned,
      allow_group_registration: form.allow_group_registration !== false,
      is_recurring: !!form.is_recurring,
      recurring_days: form.is_recurring ? (form.recurring_days ?? []) : [],
      recurring_start_time: form.is_recurring ? form.recurring_start_time : null,
      recurring_end_time: form.is_recurring ? form.recurring_end_time : null,
      recurring_until: form.is_recurring ? (form.recurring_until || null) : null,
      is_online: !!form.is_online,
      youtube_url: form.is_online ? (form.youtube_url || null) : null,
      episode_count: isEpisodeProgram ? Number(form.episode_count) : 0,
      episode_youtube_urls: isEpisodeProgram ? buildEpisodeUrls(form.episode_youtube_urls ?? [], Number(form.episode_count)) : [],
      payment_category_id: form.payment_category_id || null,
      qris_method_id: form.qris_method_id || null,
    } as any).eq("id", ev.id);
    if (isSportEvent) {
      await supabase.from("events").update({ registration_type: "paid", price: 0 } as any).eq("id", ev.id);
    }
    if (error) return toast.error(error.message);

    if (isSportEvent) {
      // Simple approach: delete old and insert new to ensure sync
      await supabase.from("event_position_pricing").delete().eq("event_id", ev.id);
      const { error: pricingError } = await supabase.from("event_position_pricing").insert(
        validPositions.map((entry) => ({ event_id: ev.id, position: entry.position.trim(), price: Number(entry.price), max_slots: entry.max_slots === "" || entry.max_slots == null ? null : Number(entry.max_slots), description: entry.description?.trim() || null }))
      );
      if (pricingError) return toast.error(`Harga posisi gagal disimpan: ${pricingError.message}`);
    }

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
          <div className="space-y-1.5"><Label>Tipe</Label><select value={form.event_type ?? "kajian"} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{EVENT_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
          <div className="space-y-1.5"><Label>Venue</Label><Input value={form.venue ?? ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
          {isSportEvent && (
            <div className="md:col-span-2 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div>
                <p className="text-sm font-semibold">{isClass ? "Daftar kelas & harga" : "Harga & kuota per posisi"}</p>
                <p className="text-xs text-muted-foreground">{isClass ? "Kelas kajian selalu wajib bayar. Kuota kosong = tanpa batas." : "Event olahraga selalu wajib bayar. Kuota kosong = tanpa batas."}</p>
              </div>
              {positions.map((entry) => <div key={entry.id || entry.position} className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-2">
                <div className="grid grid-cols-[1fr_120px_100px_auto] gap-2">
                  <Input value={entry.position} placeholder={isClass ? "Nama kelas" : "Nama posisi"} onChange={(e) => setPositions(positions.map((item) => (item.id === entry.id || item.position === entry.position) ? { ...item, position: e.target.value } : item))} />
                  <Input type="number" min="1" value={entry.price} placeholder="Harga" onChange={(e) => setPositions(positions.map((item) => (item.id === entry.id || item.position === entry.position) ? { ...item, price: e.target.value } : item))} />
                  <Input type="number" min="1" value={entry.max_slots ?? ""} placeholder="Kuota" onChange={(e) => setPositions(positions.map((item) => (item.id === entry.id || item.position === entry.position) ? { ...item, max_slots: e.target.value } : item))} />
                  <Button type="button" variant="outline" size="icon" disabled={positions.length === 1} onClick={() => setPositions(positions.filter((item) => (item.id !== entry.id && item.position !== entry.position)))}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {isClass && (
                  <Textarea rows={2} value={entry.description ?? ""} placeholder="Benefit kelas ini (contoh: modul, sertifikat, konsumsi)" onChange={(e) => setPositions(positions.map((item) => (item.id === entry.id || item.position === entry.position) ? { ...item, description: e.target.value } : item))} className="text-sm" />
                )}
              </div>)}
              <Button type="button" variant="outline" size="sm" onClick={() => setPositions([...positions, { id: crypto.randomUUID(), position: "", price: "", max_slots: "", description: "" }])}><Plus className="mr-1 h-4 w-4" />{isClass ? "Tambah kelas" : "Tambah posisi"}</Button>
            </div>
          )}
          <div className="space-y-1.5 md:col-span-2"><Label>Deskripsi</Label><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Kota</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Poster Event</Label><ImagePicker bucket="events" value={form.poster_url ?? ""} onChange={(url) => setForm({ ...form, poster_url: url })} /></div>
          <div className="space-y-1.5"><Label>Link Grup</Label><Input value={form.group_link ?? ""} onChange={(e) => setForm({ ...form, group_link: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Facebook Pixel ID (opsional)</Label><Input inputMode="numeric" placeholder="Contoh: 123456789012345" value={form.facebook_pixel_id ?? ""} onChange={(e) => setForm({ ...form, facebook_pixel_id: e.target.value.replace(/[^0-9]/g, "") })} /><p className="text-[11px] text-muted-foreground">Jika diisi, Facebook Pixel dipasang di halaman event ini untuk pelacakan iklan dan konversi.</p></div>
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
          <div className="space-y-1.5"><Label>Max Peserta (opsional)</Label><Input type="number" min="1" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} placeholder="Tanpa batas" /></div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status ?? "active"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">active</option>
              <option value="finished">finished</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <PaymentCategoryFields form={form} setForm={setForm} show={isSportEvent || form.registration_type === "paid"} />
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

