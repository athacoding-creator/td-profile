import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save, ArrowUp, ArrowDown } from "lucide-react";
import { Section } from "./components";
import { ImagePicker } from "@/components/admin/ImagePicker";

type Slide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
};

const empty = { title: "", subtitle: "", image_url: "", cta_label: "", cta_href: "", sort_order: 0, is_active: true };

export default function Hero() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const { data } = await supabase.from("hero_slides").select("*").order("sort_order", { ascending: true });
    setSlides((data as Slide[]) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("hero-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "hero_slides" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const create = async () => {
    if (!form.image_url) return toast.error("Gambar wajib diisi");
    const { error } = await supabase.from("hero_slides").insert({
      title: form.title || null,
      subtitle: form.subtitle || null,
      image_url: form.image_url,
      cta_label: form.cta_label || null,
      cta_href: form.cta_href || null,
      sort_order: Number(form.sort_order) || slides.length,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Slide ditambahkan");
    setForm(empty);
  };

  const update = async (id: string, patch: Partial<Slide>) => {
    const { error } = await supabase.from("hero_slides").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tersimpan");
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus slide ini?")) return;
    const { error } = await supabase.from("hero_slides").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dihapus");
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const a = slides[i], b = slides[j];
    await supabase.from("hero_slides").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("hero_slides").update({ sort_order: a.sort_order }).eq("id", b.id);
  };

  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-bold">Hero / Banner</h1>
        <p className="text-xs text-muted-foreground">Atur slide hero di halaman utama (realtime)</p>
      </div>

      <Section title="Tambah slide baru">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Gambar *</Label>
            <ImagePicker value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Judul</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subjudul</Label>
              <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Label tombol</Label>
              <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Misal: Daftar" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Link tombol</Label>
              <Input value={form.cta_href} onChange={(e) => setForm({ ...form, cta_href: e.target.value })} placeholder="/event/xxx" />
            </div>
          </div>
          <Button onClick={create} className="w-full"><Plus className="mr-2 h-4 w-4" /> Tambah</Button>
        </div>
      </Section>

      <Section title={`Daftar slide (${slides.length})`}>
        {slides.length === 0 && <p className="text-sm text-muted-foreground">Belum ada slide.</p>}
        <div className="space-y-3">
          {slides.map((s, i) => (
            <SlideRow key={s.id} s={s} idx={i} total={slides.length} onUpdate={update} onDelete={remove} onMove={move} />
          ))}
        </div>
      </Section>
    </>
  );
}

function SlideRow({ s, idx, total, onUpdate, onDelete, onMove }: {
  s: Slide; idx: number; total: number;
  onUpdate: (id: string, p: Partial<Slide>) => void;
  onDelete: (id: string) => void;
  onMove: (i: number, d: -1 | 1) => void;
}) {
  const [edit, setEdit] = useState(s);
  useEffect(() => setEdit(s), [s]);
  const dirty = JSON.stringify(edit) !== JSON.stringify(s);
  return (
    <div className="rounded-xl border border-border/60 p-3 space-y-2">
      <ImagePicker value={edit.image_url} onChange={(url) => setEdit({ ...edit, image_url: url })} />
      <div className="grid gap-2 md:grid-cols-2">
        <Input value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Judul" />
        <Input value={edit.subtitle ?? ""} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} placeholder="Subjudul" />
        <Input value={edit.cta_label ?? ""} onChange={(e) => setEdit({ ...edit, cta_label: e.target.value })} placeholder="Label tombol" />
        <Input value={edit.cta_href ?? ""} onChange={(e) => setEdit({ ...edit, cta_href: e.target.value })} placeholder="Link tombol" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={edit.is_active ? "1" : "0"}
          onChange={(e) => setEdit({ ...edit, is_active: e.target.value === "1" })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="1">Aktif</option>
          <option value="0">Nonaktif</option>
        </select>
        <Button size="sm" variant="outline" disabled={idx === 0} onClick={() => onMove(idx, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="outline" disabled={idx === total - 1} onClick={() => onMove(idx, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
        <Button size="sm" disabled={!dirty} onClick={() => onUpdate(s.id, edit)} className="flex-1">
          <Save className="mr-1 h-3.5 w-3.5" /> Simpan
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}
