import { useEffect, useState } from "react";
import { Pencil, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { confirmDelete } from "@/lib/confirmDelete";
import { EventTypeRecord, REGISTRATION_TYPE_OPTIONS, registrationTypeLabel } from "@/lib/eventTypeSettings";
import { Section } from "./components";

type EventTypeForm = Pick<EventTypeRecord, "value" | "label" | "default_registration_type" | "is_active" | "sort_order">;

const emptyForm: EventTypeForm = {
  value: "",
  label: "",
  default_registration_type: "free",
  is_active: true,
  sort_order: 0,
};

export default function EventTypesPage() {
  const [types, setTypes] = useState<EventTypeRecord[]>([]);
  const [form, setForm] = useState<EventTypeForm>(emptyForm);
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("event_types").select("*").order("sort_order").order("label");
    if (error) toast.error(error.message);
    setTypes((data ?? []) as EventTypeRecord[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const reset = () => {
    setForm(emptyForm);
    setEditingValue(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = form.value.trim().toLowerCase();
    const label = form.label.trim();
    if (!value || !label) return toast.error("Kode dan nama tipe wajib diisi.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      return toast.error("Kode hanya boleh berisi huruf kecil, angka, dan tanda hubung.");
    }

    const payload = {
      value,
      label,
      default_registration_type: form.default_registration_type,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const query = editingValue
      ? supabase.from("event_types").update({ ...payload, value: editingValue }).eq("value", editingValue)
      : supabase.from("event_types").insert(payload);
    const { error } = await query;
    if (error) return toast.error(error.message);
    toast.success(editingValue ? "Tipe event diperbarui" : "Tipe event dibuat");
    reset();
    await load();
  };

  const startEdit = (type: EventTypeRecord) => {
    setEditingValue(type.value);
    setForm({
      value: type.value,
      label: type.label,
      default_registration_type: type.default_registration_type,
      is_active: type.is_active,
      sort_order: type.sort_order,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (type: EventTypeRecord) => {
    const { error } = await supabase.from("event_types").update({ is_active: !type.is_active }).eq("value", type.value);
    if (error) return toast.error(error.message);
    toast.success(type.is_active ? "Tipe dinonaktifkan" : "Tipe diaktifkan");
    await load();
  };

  const remove = async (type: EventTypeRecord) => {
    if (!(await confirmDelete({ title: "Hapus tipe event ini?", itemName: type.label }))) return;
    const { error } = await supabase.from("event_types").delete().eq("value", type.value);
    if (error) return toast.error(error.message.includes("dipakai") ? error.message : `Tipe tidak dapat dihapus: ${error.message}`);
    toast.success("Tipe event dihapus");
    await load();
  };

  return (
    <>
      <div>
        <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">Tipe Event</h1>
        <p className="text-xs text-muted-foreground">Kelola tipe event dan metode pendaftaran bawaannya.</p>
      </div>

      <Section title={editingValue ? "Edit Tipe Event" : "Tambah Tipe Event"}>
        <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Kode</Label>
            <Input required disabled={!!editingValue} placeholder="contoh: kajian" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            <p className="text-[11px] text-muted-foreground">Kode dipakai di events.event_type dan tidak dapat diubah setelah dibuat.</p>
          </div>
          <div className="space-y-1.5"><Label>Nama tampilan</Label><Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Metode pendaftaran bawaan</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.default_registration_type} onChange={(e) => setForm({ ...form, default_registration_type: e.target.value as EventTypeForm["default_registration_type"] })}>{REGISTRATION_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <div className="space-y-1.5"><Label>Urutan</Label><Input type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
          <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Aktif dan dapat dipilih untuk event baru</label>
          <div className="flex gap-2 md:col-span-2"><Button type="submit">{editingValue ? "Simpan Perubahan" : "Tambah Tipe"}</Button>{editingValue && <Button type="button" variant="outline" onClick={reset}>Batal</Button>}</div>
        </form>
      </Section>

      <Section title={`Daftar Tipe (${types.length})`}>
        {loading ? <p className="text-sm text-muted-foreground">Memuat tipe event…</p> : types.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada tipe event.</p> : <div className="space-y-2">{types.map((type) => <div key={type.value} className="flex flex-col gap-3 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{type.label}</span><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{type.value}</code><span className={`rounded px-2 py-0.5 text-xs ${type.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{type.is_active ? "Aktif" : "Nonaktif"}</span></div><p className="mt-1 text-xs text-muted-foreground">Bawaan: {registrationTypeLabel(type.default_registration_type)} · Urutan {type.sort_order}</p></div><div className="flex gap-1.5"><Button size="sm" variant="outline" onClick={() => startEdit(type)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button><Button size="sm" variant="outline" onClick={() => toggleActive(type)}><Power className="mr-1 h-3.5 w-3.5" />{type.is_active ? "Nonaktifkan" : "Aktifkan"}</Button><Button size="sm" variant="outline" onClick={() => remove(type)}><Trash2 className="mr-1 h-3.5 w-3.5" />Hapus</Button></div></div>)}</div>}
      </Section>
    </>
  );
}
