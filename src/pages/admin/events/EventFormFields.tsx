import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {Pin, Repeat, Camera, Users} from "lucide-react";
import {DAY_NAMES} from "@/lib/eventSchedule";
import {buildEpisodeUrls} from "./helpers";

/** Bagian-bagian form event yang dipakai bersama oleh form Buat & Edit. */
export function EpisodeFields({ form, setForm, program }: { form: any; setForm: (f: any) => void; program?: any }) {
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

export function OnlineFields({ form, setForm, program }: { form: any; setForm: (f: any) => void; program?: any }) {
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

export function RecurringPinFields({ form, setForm }: { form: any; setForm: (f: any) => void }) {
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
        <input
          type="checkbox"
          checked={form.allow_group_registration !== false}
          onChange={(e) => setForm({ ...form, allow_group_registration: e.target.checked })}
        />
        <Users className="h-4 w-4 text-primary" /> Daftar rombongan (lebih dari 1 orang sekaligus)
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


export function PaymentCategoryFields({ form, setForm, show }: { form: any; setForm: (v: any) => void; show: boolean }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);

  useEffect(() => {
    if (!show) return;
    (async () => {
      const [{ data: cats }, { data: qris }] = await Promise.all([
        supabase.from("payment_categories").select("id,name,slug,is_active").order("order_index"),
        supabase.from("qris_methods").select("id,name,category_id,is_active").order("order_index"),
      ]);
      setCategories((cats || []).filter((c: any) => c.is_active && c.slug !== "infaq"));
      setMethods((qris || []).filter((q: any) => q.is_active));
    })();
  }, [show]);

  if (!show) return null;

  const filteredMethods = form.payment_category_id
    ? methods.filter((m) => m.category_id === form.payment_category_id)
    : methods;

  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Kategori Pembayaran</Label>
        <select
          className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm"
          value={form.payment_category_id ?? ""}
          onChange={(e) => setForm({ ...form, payment_category_id: e.target.value, qris_method_id: "" })}
        >
          <option value="">— pakai QRIS default —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">QRIS Khusus (opsional)</Label>
        <select
          className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm"
          value={form.qris_method_id ?? ""}
          onChange={(e) => setForm({ ...form, qris_method_id: e.target.value })}
        >
          <option value="">— otomatis dari kategori —</option>
          {filteredMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
    </>
  );
}

