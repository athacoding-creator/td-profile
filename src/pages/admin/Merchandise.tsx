import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { Section } from "./components";
import { ImagePicker } from "@/components/admin/ImagePicker";

type Reward = {
  id: string;
  name: string;
  description: string | null;
  cost_points: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
};

const empty = { name: "", description: "", cost_points: 100, stock: 0, image_url: "", is_active: true };

export default function Merchandise() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const { data } = await supabase.from("rewards").select("*").order("created_at", { ascending: false });
    setRewards((data as Reward[]) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("rewards-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "rewards" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const create = async () => {
    if (!form.name || !form.cost_points) return toast.error("Nama & poin wajib diisi");
    const { error } = await supabase.from("rewards").insert({
      name: form.name,
      description: form.description || null,
      cost_points: Number(form.cost_points),
      stock: Number(form.stock) || 0,
      image_url: form.image_url || null,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Merchandise ditambahkan");
    setForm(empty);
  };

  const update = async (r: Reward, patch: Partial<Reward>) => {
    const { error } = await supabase.from("rewards").update(patch).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Tersimpan");
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus merchandise ini?")) return;
    const { error } = await supabase.from("rewards").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dihapus");
  };

  return (
    <>
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold">Merchandise</h1>
        <p className="text-xs text-muted-foreground">Atur reward yang bisa ditukar dengan poin</p>
      </div>

      <Section title="Tambah merchandise baru">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Nama</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Kaos Lir-Ilir" className="text-sm h-9 sm:h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Deskripsi</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opsional" className="text-sm h-9 sm:h-10" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Poin</Label>
              <Input type="number" value={form.cost_points} onChange={(e) => setForm({ ...form, cost_points: e.target.value })} className="text-sm h-9 sm:h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stok</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="text-sm h-9 sm:h-10" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Gambar</Label>
            <ImagePicker bucket="merchandise" value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
          </div>
          <Button onClick={create} className="w-full h-9 sm:h-10 text-sm">
            <Plus className="mr-2 h-4 w-4" /> Tambah
          </Button>
        </div>
      </Section>

      <Section title={`Daftar merchandise (${rewards.length})`}>
        {rewards.length === 0 && <p className="text-sm text-muted-foreground">Belum ada merchandise.</p>}
        <div className="space-y-2 sm:space-y-3">
          {rewards.map((r) => (
            <RewardRow key={r.id} r={r} onUpdate={update} onDelete={remove} />
          ))}
        </div>
      </Section>
    </>
  );
}

function RewardRow({ r, onUpdate, onDelete }: { r: Reward; onUpdate: (r: Reward, p: Partial<Reward>) => void; onDelete: (id: string) => void }) {
  const [edit, setEdit] = useState(r);
  useEffect(() => setEdit(r), [r]);
  const dirty = JSON.stringify(edit) !== JSON.stringify(r);
  return (
    <div className="rounded-xl border border-border/60 p-3 space-y-2">
      <div className="flex-1 space-y-1.5">
        <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="text-sm h-9 sm:h-10" />
        <Input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Deskripsi" className="text-sm h-9 sm:h-10" />
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <div>
          <Label className="text-[10px] sm:text-xs">Poin</Label>
          <Input type="number" value={edit.cost_points} onChange={(e) => setEdit({ ...edit, cost_points: Number(e.target.value) })} className="text-xs sm:text-sm h-8 sm:h-9" />
        </div>
        <div>
          <Label className="text-[10px] sm:text-xs">Stok</Label>
          <Input type="number" value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: Number(e.target.value) })} className="text-xs sm:text-sm h-8 sm:h-9" />
        </div>
        <div>
          <Label className="text-[10px] sm:text-xs">Aktif</Label>
          <select
            value={edit.is_active ? "1" : "0"}
            onChange={(e) => setEdit({ ...edit, is_active: e.target.value === "1" })}
            className="h-8 sm:h-9 w-full rounded-md border border-input bg-background px-2 text-xs sm:text-sm"
          >
            <option value="1">Ya</option>
            <option value="0">Tidak</option>
          </select>
        </div>
      </div>
      <div>
        <Label className="text-[10px] sm:text-xs">Gambar</Label>
        <ImagePicker bucket="merchandise" value={edit.image_url ?? ""} onChange={(url) => setEdit({ ...edit, image_url: url })} />
      </div>
      <div className="flex gap-1.5 sm:gap-2">
        <Button size="sm" disabled={!dirty} onClick={() => onUpdate(r, edit)} className="flex-1 h-8 sm:h-9 text-[11px] sm:text-xs">
          <Save className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> Simpan
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(r.id)} className="h-8 sm:h-9">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
