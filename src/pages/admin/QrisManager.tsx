import { confirmDelete } from "@/lib/confirmDelete";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Trash2, Plus, Edit2, Eye, EyeOff, MoveUp, MoveDown, Info, AlertTriangle, Search } from "lucide-react";
import { Section } from "./components";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  whatsapp_number: string | null;
  is_system: boolean;
  is_active: boolean;
  order_index: number;
}

interface QrisMethod {
  id: string;
  name: string;
  description: string | null;
  qr_url: string;
  category: string;
  category_id: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
  order_index: number;
}

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `kategori-${Date.now()}`;

export default function QrisManagerPage() {
  const [qrisMethods, setQrisMethods] = useState<QrisMethod[]>([]);
  const [categories, setCategories] = useState<PaymentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    qr_url: "",
    category_id: "",
    whatsapp_number: "",
    is_active: true,
  });

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: "", description: "", whatsapp_number: "", is_active: true });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: cats, error: catErr }, { data: qris, error: qrisErr }] = await Promise.all([
      supabase.from("payment_categories").select("*").order("order_index", { ascending: true }),
      supabase.from("qris_methods").select("*").order("order_index", { ascending: true }),
    ]);
    if (catErr) toast.error("Gagal memuat kategori: " + catErr.message);
    if (qrisErr) toast.error("Gagal memuat QRIS: " + qrisErr.message);
    setCategories((cats || []) as PaymentCategory[]);
    setQrisMethods((qris || []) as unknown as QrisMethod[]);
    setLoading(false);
  };

  const categoryById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const emptyCategories = useMemo(
    () => categories.filter((c) => c.is_active && !qrisMethods.some((q) => q.category_id === c.id && q.is_active)),
    [categories, qrisMethods]
  );

  const visibleQris = useMemo(
    () =>
      qrisMethods.filter((q) => {
        const matchCat = filterCategory === "all" || q.category_id === filterCategory;
        const matchSearch = !search.trim() || q.name.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
      }),
    [qrisMethods, filterCategory, search]
  );

  const groupedQris = useMemo(() => {
    const groups: { category: PaymentCategory | null; items: QrisMethod[] }[] = [];
    categories.forEach((cat) => {
      const items = visibleQris.filter((q) => q.category_id === cat.id);
      if (items.length) groups.push({ category: cat, items });
    });
    const orphans = visibleQris.filter((q) => !q.category_id || !categoryById[q.category_id]);
    if (orphans.length) groups.push({ category: null, items: orphans });
    return groups;
  }, [visibleQris, categories, categoryById]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      qr_url: "",
      category_id: categories[0]?.id ?? "",
      whatsapp_number: "",
      is_active: true,
    });
    setEditingId(null);
  };

  const openEditDialog = (qris: QrisMethod) => {
    setFormData({
      name: qris.name,
      description: qris.description || "",
      qr_url: qris.qr_url,
      category_id: qris.category_id || "",
      whatsapp_number: qris.whatsapp_number || "",
      is_active: qris.is_active,
    });
    setEditingId(qris.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error("Nama QRIS harus diisi");
    if (!formData.qr_url.trim()) return toast.error("Gambar QRIS harus diisi");
    if (!formData.category_id) return toast.error("Pilih kategori pembayaran terlebih dahulu");

    const category = categoryById[formData.category_id];
    const payload: any = {
      name: formData.name.trim(),
      description: formData.description || null,
      qr_url: formData.qr_url,
      category_id: formData.category_id,
      category: category?.slug === "infaq" ? "infaq" : "paid",
      whatsapp_number: formData.whatsapp_number.trim() || null,
      is_active: formData.is_active,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("qris_methods")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("QRIS berhasil diperbarui");
      } else {
        const { error } = await supabase.from("qris_methods").insert({ ...payload, order_index: qrisMethods.length });
        if (error) throw error;
        toast.success("QRIS berhasil ditambahkan");
      }
      setDialogOpen(false);
      resetForm();
      loadAll();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete({ title: "Hapus QRIS ini?" }))) return;
    const { error } = await supabase.from("qris_methods").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("QRIS berhasil dihapus");
    loadAll();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from("qris_methods").update({ is_active: !isActive }).eq("id", id);
    if (error) return toast.error(error.message);
    loadAll();
  };

  const move = async (qris: QrisMethod, direction: -1 | 1) => {
    const ordered = [...qrisMethods];
    const index = ordered.findIndex((q) => q.id === qris.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const a = ordered[index];
    const b = ordered[target];
    const { error } = await supabase.from("qris_methods").upsert([
      { id: a.id, order_index: b.order_index },
      { id: b.id, order_index: a.order_index },
    ] as any);
    if (error) return toast.error(error.message);
    loadAll();
  };

  // ---- Kategori ----
  const resetCatForm = () => {
    setCatForm({ name: "", description: "", whatsapp_number: "", is_active: true });
    setEditingCatId(null);
  };

  const openEditCategory = (cat: PaymentCategory) => {
    setCatForm({
      name: cat.name,
      description: cat.description || "",
      whatsapp_number: cat.whatsapp_number || "",
      is_active: cat.is_active,
    });
    setEditingCatId(cat.id);
    setCatDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!catForm.name.trim()) return toast.error("Nama kategori harus diisi");
    const payload: any = {
      name: catForm.name.trim(),
      description: catForm.description || null,
      whatsapp_number: catForm.whatsapp_number.trim() || null,
      is_active: catForm.is_active,
    };
    try {
      if (editingCatId) {
        const { error } = await supabase.from("payment_categories").update(payload).eq("id", editingCatId);
        if (error) throw error;
        toast.success("Kategori diperbarui");
      } else {
        const { error } = await supabase
          .from("payment_categories")
          .insert({ ...payload, slug: slugify(catForm.name), order_index: categories.length });
        if (error) throw error;
        toast.success("Kategori ditambahkan");
      }
      setCatDialogOpen(false);
      resetCatForm();
      loadAll();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteCategory = async (cat: PaymentCategory) => {
    if (cat.is_system) return toast.error("Kategori bawaan tidak bisa dihapus");
    const used = qrisMethods.filter((q) => q.category_id === cat.id).length;
    if (!(await confirmDelete({ title: `Hapus kategori "${cat.name}"?`, description: used ? `${used} QRIS akan kehilangan kategori.` : undefined }))) return;
    const { error } = await supabase.from("payment_categories").delete().eq("id", cat.id);
    if (error) return toast.error(error.message);
    toast.success("Kategori dihapus");
    loadAll();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="animate-pulse">Memuat data QRIS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">QRIS Manager</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Kelola kategori pembayaran (kelas, futsal, dll) beserta QRIS-nya. Kategori Infaq tetap memakai alur infaq.
        </p>
      </div>

      {emptyCategories.length > 0 && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-xs sm:text-sm">
            Kategori tanpa QRIS aktif: <strong>{emptyCategories.map((c) => c.name).join(", ")}</strong>. Event pada kategori ini
            tidak akan menampilkan QRIS saat user membayar.
          </p>
        </div>
      )}

      <Tabs defaultValue="qris" className="space-y-4">
        <TabsList>
          <TabsTrigger value="qris">Daftar QRIS</TabsTrigger>
          <TabsTrigger value="kategori">Kategori Pembayaran</TabsTrigger>
        </TabsList>

        <TabsContent value="qris" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari nama QRIS…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="sm:w-56"><SelectValue placeholder="Semua kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="bg-primary text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah QRIS
            </Button>
          </div>

          {groupedQris.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border/60 py-12 text-center">
              <p className="text-sm text-muted-foreground">Belum ada QRIS yang cocok.</p>
            </div>
          ) : (
            groupedQris.map((group) => (
              <Section key={group.category?.id ?? "tanpa-kategori"} title={group.category?.name ?? "Tanpa kategori"}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {group.items.map((qris) => (
                    <div
                      key={qris.id}
                      className={`flex flex-col gap-4 rounded-2xl border p-4 transition-all ${
                        qris.is_active
                          ? "bg-card border-border/60 shadow-sm"
                          : "bg-muted/30 border-dashed border-muted-foreground/30 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-bold">{qris.name}</h3>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {qris.is_active ? "Aktif" : "Nonaktif"}
                            </span>
                          </div>
                          {qris.description && <p className="line-clamp-2 text-xs text-muted-foreground">{qris.description}</p>}
                          {qris.whatsapp_number && (
                            <p className="mt-1 text-xs text-muted-foreground">Konfirmasi WA: {qris.whatsapp_number}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => toggleActive(qris.id, qris.is_active)}>
                            {qris.is_active ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => openEditDialog(qris)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(qris.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-border/40 bg-white p-2 shadow-inner">
                          <img src={qris.qr_url} alt={qris.name} className="h-full w-full object-contain" />
                        </div>
                        <div className="flex flex-1 gap-2">
                          <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => move(qris, -1)}>
                            <MoveUp className="mr-1 h-3.5 w-3.5" /> Naik
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => move(qris, 1)}>
                            <MoveDown className="mr-1 h-3.5 w-3.5" /> Turun
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            ))
          )}
        </TabsContent>

        <TabsContent value="kategori" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetCatForm(); setCatDialogOpen(true); }} className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Tambah Kategori
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {categories.map((cat) => {
              const total = qrisMethods.filter((q) => q.category_id === cat.id).length;
              return (
                <div key={cat.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-bold">{cat.name}</h3>
                      {cat.is_system && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Bawaan</span>}
                      {!cat.is_active && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">Nonaktif</span>}
                    </div>
                    {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{total} QRIS{cat.whatsapp_number ? ` · WA ${cat.whatsapp_number}` : ""}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => openEditCategory(cat)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={cat.is_system} onClick={() => deleteCategory(cat)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit QRIS" : "Tambah QRIS Baru"}</DialogTitle>
            <DialogDescription>QRIS akan dipakai pada event yang memilih kategori ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Nama QRIS</Label>
              <Input placeholder="Contoh: QRIS Futsal" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Kategori Pembayaran</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Deskripsi (opsional)</Label>
              <Input placeholder="Contoh: Atas nama Budi Santoso" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">No. WhatsApp Konfirmasi (opsional)</Label>
              <Input placeholder="Contoh: 6281234567890" value={formData.whatsapp_number} onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
              <Label className="text-sm font-semibold">Aktif</Label>
              <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Gambar QRIS</Label>
              <ImagePicker bucket="qris" value={formData.qr_url} onChange={(url) => setFormData({ ...formData, qr_url: url })} />
            </div>
            {formData.qr_url && (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview Tampilan</p>
                <div className="flex justify-center rounded-lg bg-white p-4">
                  <img src={formData.qr_url} alt="QRIS Preview" className="max-h-48 object-contain" />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-4 sm:flex-row">
              <Button onClick={handleSave} className="order-first flex-1 bg-primary text-primary-foreground sm:order-last">
                <Save className="mr-2 h-4 w-4" />{editingId ? "Simpan Perubahan" : "Simpan QRIS"}
              </Button>
              <Button onClick={() => setDialogOpen(false)} variant="outline" className="flex-1">Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editingCatId ? "Edit Kategori" : "Tambah Kategori Pembayaran"}</DialogTitle>
            <DialogDescription>Contoh kategori: Bayar Kelas, Futsal, Camp.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Nama Kategori</Label>
              <Input placeholder="Contoh: Futsal" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Keterangan (opsional)</Label>
              <Input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">No. WhatsApp Konfirmasi (opsional)</Label>
              <Input placeholder="Contoh: 6281234567890" value={catForm.whatsapp_number} onChange={(e) => setCatForm({ ...catForm, whatsapp_number: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
              <Label className="text-sm font-semibold">Aktif</Label>
              <Switch checked={catForm.is_active} onCheckedChange={(checked) => setCatForm({ ...catForm, is_active: checked })} />
            </div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button onClick={saveCategory} className="order-first flex-1 bg-primary text-primary-foreground sm:order-last">
                <Save className="mr-2 h-4 w-4" />Simpan
              </Button>
              <Button onClick={() => setCatDialogOpen(false)} variant="outline" className="flex-1">Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-6">
        <div className="flex gap-3">
          <Info className="h-5 w-5 shrink-0 text-blue-600" />
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-blue-900">Panduan Pengelolaan</h3>
            <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-xs text-blue-800/80 sm:grid-cols-2">
              <p>• <strong>Kategori:</strong> buat kategori sesuai jenis pembayaran (kelas, futsal, dll).</p>
              <p>• <strong>Event berbayar:</strong> pilih kategorinya di form event agar QRIS-nya sesuai.</p>
              <p>• <strong>Infaq:</strong> tetap otomatis memakai QRIS kategori Infaq.</p>
              <p>• <strong>Urutan:</strong> QRIS teratas yang aktif dipakai sebagai default kategori.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
