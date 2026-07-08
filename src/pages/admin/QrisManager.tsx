import { confirmDelete } from "@/lib/confirmDelete";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Trash2, Plus, Edit2, Eye, EyeOff, MoveUp, MoveDown, Info } from "lucide-react";
import { Section } from "./components";
import { ImagePicker } from "@/components/admin/ImagePicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QrisMethod {
  id: string;
  name: string;
  description: string | null;
  qr_url: string;
  category: "paid" | "infaq";
  is_active: boolean;
  order_index: number;
}

export default function QrisManagerPage() {
  const [qrisMethods, setQrisMethods] = useState<QrisMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    qr_url: "",
    category: "paid" as "paid" | "infaq",
  });

  useEffect(() => {
    loadQrisMethods();
  }, []);

  const loadQrisMethods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("qris_methods")
      .select("*")
      .order("order_index", { ascending: true });
    
    if (error) {
      toast.error("Gagal memuat QRIS: " + error.message);
    } else {
      setQrisMethods((data || []) as QrisMethod[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      qr_url: "",
      category: "paid",
    });
    setEditingId(null);
  };

  const openEditDialog = (qris: QrisMethod) => {
    setFormData({
      name: qris.name,
      description: qris.description || "",
      qr_url: qris.qr_url,
      category: qris.category,
    });
    setEditingId(qris.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      return toast.error("Nama QRIS harus diisi");
    }
    if (!formData.qr_url.trim()) {
      return toast.error("URL QRIS harus diisi");
    }

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from("qris_methods")
          .update({
            name: formData.name,
            description: formData.description || null,
            qr_url: formData.qr_url,
            category: formData.category,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("QRIS berhasil diperbarui");
      } else {
        // Create new
        const { error } = await supabase.from("qris_methods").insert({
          name: formData.name,
          description: formData.description || null,
          qr_url: formData.qr_url,
          category: formData.category,
          order_index: qrisMethods.length,
        });

        if (error) throw error;
        toast.success("QRIS berhasil ditambahkan");
      }

      setDialogOpen(false);
      resetForm();
      loadQrisMethods();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete({ title: "Hapus QRIS ini?" }))) return;

    try {
      const { error } = await supabase
        .from("qris_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("QRIS berhasil dihapus");
      loadQrisMethods();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("qris_methods")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      loadQrisMethods();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const items = [...qrisMethods];
    [items[index - 1].order_index, items[index].order_index] = [
      items[index].order_index,
      items[index - 1].order_index,
    ];

    try {
      await Promise.all(
        items.map((item) =>
          supabase
            .from("qris_methods")
            .update({ order_index: item.order_index })
            .eq("id", item.id)
        )
      );
      loadQrisMethods();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const moveDown = async (index: number) => {
    if (index === qrisMethods.length - 1) return;
    const items = [...qrisMethods];
    [items[index + 1].order_index, items[index].order_index] = [
      items[index].order_index,
      items[index + 1].order_index,
    ];

    try {
      await Promise.all(
        items.map((item) =>
          supabase
            .from("qris_methods")
            .update({ order_index: item.order_index })
            .eq("id", item.id)
        )
      );
      loadQrisMethods();
    } catch (error: any) {
      toast.error(error.message);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">QRIS Manager</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola QRIS untuk pembayaran dan infaq
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              className="w-full sm:w-auto bg-primary text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah QRIS
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit QRIS" : "Tambah QRIS Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Perbarui data QRIS"
                  : "Tambahkan QRIS baru untuk pembayaran atau infaq"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Nama QRIS</Label>
                <Input
                  placeholder="Contoh: QRIS Pembayaran Utama"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Deskripsi (opsional)</Label>
                <Input
                  placeholder="Contoh: Atas nama Budi Santoso"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category: value as "paid" | "infaq",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pembayaran</SelectItem>
                    <SelectItem value="infaq">Infaq</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Gambar QRIS</Label>
                <ImagePicker
                  bucket="qris"
                  value={formData.qr_url}
                  onChange={(url) =>
                    setFormData({ ...formData, qr_url: url })
                  }
                />
              </div>

              {formData.qr_url && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">
                    Preview Tampilan
                  </p>
                  <div className="flex justify-center bg-white p-4 rounded-lg">
                    <img
                      src={formData.qr_url}
                      alt="QRIS Preview"
                      className="max-h-48 object-contain"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-primary text-primary-foreground order-first sm:order-last"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {editingId ? "Simpan Perubahan" : "Simpan QRIS"}
                </Button>
                <Button
                  onClick={() => setDialogOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Batal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Section title="Daftar QRIS Aktif">
        {qrisMethods.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border-2 border-dashed border-border/60">
            <p className="text-muted-foreground text-sm">Belum ada QRIS yang ditambahkan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qrisMethods.map((qris, index) => (
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
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-base truncate">{qris.name}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          qris.category === "paid"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {qris.category === "paid" ? "Pembayaran" : "Infaq"}
                      </span>
                    </div>
                    {qris.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {qris.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full"
                      onClick={() => toggleActive(qris.id, qris.is_active)}
                      title={qris.is_active ? "Nonaktifkan" : "Aktifkan"}
                    >
                      {qris.is_active ? (
                        <Eye className="h-4 w-4 text-primary" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full"
                      onClick={() => openEditDialog(qris)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(qris.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  <div className="h-24 w-24 flex-shrink-0 bg-white p-2 rounded-xl border border-border/40 shadow-inner overflow-hidden">
                    <img
                      src={qris.qr_url}
                      alt={qris.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                      >
                        <MoveUp className="h-3.5 w-3.5 mr-1" /> Naik
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8"
                        onClick={() => moveDown(index)}
                        disabled={index === qrisMethods.length - 1}
                      >
                        <MoveDown className="h-3.5 w-3.5 mr-1" /> Turun
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Urutan: {index + 1}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="rounded-2xl bg-blue-50 p-4 sm:p-6 border border-blue-100">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Panduan Pengelolaan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs text-blue-800/80">
              <p>• <strong>Pembayaran:</strong> Muncul otomatis di event berbayar.</p>
              <p>• <strong>Infaq:</strong> Muncul otomatis di event bertipe infaq.</p>
              <p>• <strong>Urutan:</strong> Atur prioritas tampil dengan tombol naik/turun.</p>
              <p>• <strong>Status:</strong> Nonaktifkan jika QRIS sedang tidak bisa digunakan.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
