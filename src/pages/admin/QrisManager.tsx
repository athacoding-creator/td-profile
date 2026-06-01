import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Trash2, Plus, Edit2, Eye, EyeOff } from "lucide-react";
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
      setQrisMethods(data || []);
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
    if (!confirm("Hapus QRIS ini?")) return;

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
    return <div className="text-center text-muted-foreground">Memuat...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">QRIS Manager</h1>
          <p className="text-sm text-muted-foreground">
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
              className="bg-primary text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah QRIS
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
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
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama QRIS</Label>
                <Input
                  placeholder="Contoh: QRIS Pembayaran Utama"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Deskripsi (opsional)</Label>
                <Input
                  placeholder="Contoh: Atas nama Budi Santoso"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Kategori</Label>
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
                <Label className="text-xs sm:text-sm">Upload QRIS Image</Label>
                <ImagePicker
                  bucket="qris"
                  value={formData.qr_url}
                  onChange={(url) =>
                    setFormData({ ...formData, qr_url: url })
                  }
                />
              </div>

              {formData.qr_url && (
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">
                    Preview QRIS
                  </p>
                  <img
                    src={formData.qr_url}
                    alt="QRIS Preview"
                    className="max-w-xs rounded-lg"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-primary text-primary-foreground"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {editingId ? "Perbarui" : "Simpan"}
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

      <Section title="Daftar QRIS">
        {qrisMethods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Belum ada QRIS. Tambahkan QRIS baru untuk memulai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {qrisMethods.map((qris, index) => (
              <div
                key={qris.id}
                className="flex items-start gap-3 rounded-lg border border-border/60 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{qris.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        qris.category === "paid"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {qris.category === "paid" ? "Pembayaran" : "Infaq"}
                    </span>
                    {!qris.is_active && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  {qris.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {qris.description}
                    </p>
                  )}
                  {qris.qr_url && (
                    <img
                      src={qris.qr_url}
                      alt={qris.name}
                      className="max-w-[120px] rounded-lg mt-2"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(qris.id, qris.is_active)}
                    title={
                      qris.is_active ? "Nonaktifkan" : "Aktifkan"
                    }
                  >
                    {qris.is_active ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(qris)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => handleDelete(qris.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="flex gap-1 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      title="Naik"
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moveDown(index)}
                      disabled={index === qrisMethods.length - 1}
                      title="Turun"
                    >
                      ↓
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Informasi">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            • QRIS yang ditandai <span className="text-blue-600">Pembayaran</span> akan ditampilkan saat event berbayar (paid)
          </p>
          <p>
            • QRIS yang ditandai <span className="text-green-600">Infaq</span> akan ditampilkan saat event infaq
          </p>
          <p>
            • Gunakan tombol ↑ dan ↓ untuk mengatur urutan tampilan QRIS
          </p>
          <p>
            • QRIS yang nonaktif tidak akan ditampilkan kepada user
          </p>
        </div>
      </Section>
    </>
  );
}
