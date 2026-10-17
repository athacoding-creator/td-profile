import { useEffect, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { BannerImage } from "@/components/HomeBanners";
import { bannerCta, hasBannerCta, isSafeBannerUrl, type HomeBannerData } from "@/lib/homeBanner";

const emptyForm = { title: "", image_url: "", showCta: false, cta_label: "", cta_href: "", sort_order: 0, is_active: true };

export default function BannersPage() {
  const [banners, setBanners] = useState<HomeBannerData[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("hero_slides")
      .select("id,title,image_url,cta_label,cta_href,sort_order,is_active")
      .order("sort_order").order("created_at");
    setLoadError(Boolean(error));
    if (error) toast.error("Gagal memuat banner: " + error.message);
    else setBanners(data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const reset = () => { setForm(emptyForm); setEditingId(null); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSafeBannerUrl(form.image_url)) return toast.error("Upload foto atau isi URL foto yang valid.");
    if (form.showCta && (!form.cta_label.trim() || !isSafeBannerUrl(form.cta_href))) {
      return toast.error("Isi teks tombol dan link lengkap yang diawali https:// atau http://.");
    }
    if (!Number.isInteger(form.sort_order) || form.sort_order < 0) return toast.error("Urutan harus bilangan bulat mulai dari 0.");
    setBusy(true);
    const payload = {
      title: form.title.trim() || null, image_url: form.image_url.trim(),
      ...bannerCta(form.showCta, form.cta_label, form.cta_href),
      sort_order: form.sort_order, is_active: form.is_active,
    };
    const { error } = editingId
      ? await supabase.from("hero_slides").update(payload).eq("id", editingId)
      : await supabase.from("hero_slides").insert(payload);
    setBusy(false);
    if (error) return toast.error("Gagal menyimpan banner: " + error.message);
    toast.success("Banner tersimpan");
    reset();
    await load();
  };

  const remove = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.from("hero_slides").delete().eq("id", id);
    setBusy(false);
    if (error) return toast.error("Gagal menghapus banner: " + error.message);
    setDeleteId(null);
    if (editingId === id) reset();
    toast.success("Banner dihapus");
    await load();
  };

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Banner Home</h1>
      <form onSubmit={save} className="space-y-5 border-b border-border pb-6">
        <h2 className="font-semibold">{editingId ? "Edit Banner" : "Tambah Banner"}</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banner-title">Nama banner</Label>
              <Input id="banner-title" value={form.title} disabled={busy} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Foto banner · Landscape 4:1 (1200 × 300 px)</Label>
              <ImagePicker bucket="hero" value={form.image_url} onChange={(image_url) => setForm((prev) => ({ ...prev, image_url }))} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="banner-cta">Tampilkan tombol di kanan</Label>
              <Switch id="banner-cta" checked={form.showCta} disabled={busy} onCheckedChange={(showCta) => setForm({ ...form, showCta })} />
            </div>
            {form.showCta && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="banner-label">Teks tombol</Label>
                  <Input id="banner-label" maxLength={40} required value={form.cta_label} disabled={busy} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="banner-link">Link tombol CTA</Label>
                  <Input id="banner-link" type="url" placeholder="https://forms.gle/..." required value={form.cta_href} disabled={busy} onChange={(e) => setForm({ ...form, cta_href: e.target.value })} />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banner-order">Urutan tampil</Label>
              <Input id="banner-order" type="number" min={0} step={1} required value={form.sort_order} disabled={busy} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="banner-active">Tampilkan di Home</Label>
              <Switch id="banner-active" checked={form.is_active} disabled={busy} onCheckedChange={(is_active) => setForm({ ...form, is_active })} />
            </div>
            {form.image_url && <div className="space-y-2"><Label>Pratinjau</Label><BannerImage banner={{ ...form, id: editingId ?? "preview", ...bannerCta(form.showCta, form.cta_label, form.cta_href) }} /></div>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || loading || loadError}><Save />{busy ? "Menyimpan…" : "Simpan Banner"}</Button>
          {editingId && <Button type="button" variant="outline" onClick={reset} disabled={busy}><X />Batal Edit</Button>}
        </div>
      </form>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Daftar Banner</h2><Button variant="ghost" onClick={reset} disabled={busy}><Plus />Tambah</Button></div>
        {loading ? <p className="text-sm text-muted-foreground">Memuat…</p> : loadError ? <Button variant="outline" onClick={() => void load()}>Coba lagi</Button> : !banners.length ? <p className="text-sm text-muted-foreground">Belum ada banner.</p> : banners.map((banner) => (
          <article key={banner.id} className="space-y-3 rounded-lg border border-border p-3">
            <BannerImage banner={banner} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{banner.title || "Banner"}</h3><p className="text-xs text-muted-foreground">{banner.is_active ? "Aktif" : "Tidak aktif"} · Urutan {banner.sort_order} · {hasBannerCta(banner) ? "Dengan tombol" : "Tanpa tombol"}</p></div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" aria-label={`Edit ${banner.title || "banner"}`} title="Edit banner" disabled={busy} onClick={() => {
                  setEditingId(banner.id);
                  setForm({ title: banner.title ?? "", image_url: banner.image_url, showCta: hasBannerCta(banner), cta_label: banner.cta_label ?? "", cta_href: banner.cta_href ?? "", sort_order: banner.sort_order, is_active: banner.is_active });
                  window.scrollTo({ top: 0, behavior: "instant" });
                }}><Pencil /></Button>
                <Button size="icon" variant="destructive" aria-label={`Hapus ${banner.title || "banner"}`} title="Hapus banner" disabled={busy} onClick={() => setDeleteId(banner.id)}><Trash2 /></Button>
              </div>
            </div>
            {deleteId === banner.id && <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3"><span className="text-sm">Hapus banner ini?</span><Button variant="destructive" disabled={busy} onClick={() => void remove(banner.id)}>Hapus</Button><Button variant="outline" disabled={busy} onClick={() => setDeleteId(null)}>Batal</Button></div>}
          </article>
        ))}
      </section>
    </>
  );
}