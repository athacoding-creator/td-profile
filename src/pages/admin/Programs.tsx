import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import QRCode from "qrcode";
import { QrCode as QrIcon, Trash2, Pencil, X } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";

export default function ProgramsPage() {
  const { programs, reloadPrograms } = useAdmin();
  const [form, setForm] = useState<any>({ code: "", name: "", description: "", gender_restriction: "", category: "single" });
  const [editProgramId, setEditProgramId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({ name: "", description: "", gender_restriction: "", category: "single" });
  const [qr, setQr] = useState<{ id: string; url: string } | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("programs").insert({
      code: form.code.toUpperCase().replace(/\s+/g, "_"),
      name: form.name,
      description: form.description || null,
      gender_restriction: form.gender_restriction || null,
      category: form.category || "single",
    });
    if (error) return toast.error(error.message);
    toast.success("Program dibuat");
    setForm({ code: "", name: "", description: "", gender_restriction: "", category: "single" });
    reloadPrograms();
  };

  const startEdit = (p: any) => {
    setEditProgramId(p.id);
    setEditForm({
      name: p.name || "",
      description: p.description || "",
      gender_restriction: p.gender_restriction || "",
      category: p.category || "single",
    });
  };

  const cancelEdit = () => {
    setEditProgramId(null);
    setEditForm({ name: "", description: "", gender_restriction: "", category: "single" });
  };

  const save = async (id: string) => {
    const { error } = await supabase.from("programs").update({
      name: editForm.name,
      description: editForm.description || null,
      gender_restriction: editForm.gender_restriction || null,
      category: editForm.category || "single",
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Program diperbarui");
    setEditProgramId(null);
    reloadPrograms();
  };

  const remove = async (id: string) => {
    const p = programs.find((x: any) => x.id === id);
    if (!(await confirmDelete({ title: "Hapus program ini?", itemName: p?.name }))) return;
    const { error } = await supabase.from("programs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Program dihapus");
    if (qr?.id === id) setQr(null);
    reloadPrograms();
  };

  const showQR = async (p: any) => {
    try {
      console.log(`[Admin QR] Fetching program QR for ${p.id}`);
      const { data: token, error } = await supabase.rpc("admin_get_program_qr", { _id: p.id });
      if (error) {
        console.error("[Admin QR] Error fetching program QR:", error);
        toast.error(`Gagal mengambil QR program: ${error?.message || "Unauthorized or token not found"}`);
        return;
      }
      if (!token) {
        console.error("[Admin QR] Program QR token is empty");
        toast.error("QR program tidak ditemukan atau belum di-generate");
        return;
      }
      console.log(`[Admin QR] Program token retrieved, generating QR image`);
      const url = await QRCode.toDataURL(token, { width: 400, margin: 2 });
      setQr({ id: p.id, url });
      console.log(`[Admin QR] Program QR display ready`);
    } catch (err: any) {
      console.error("[Admin QR] Unexpected error:", err);
      toast.error(`Error: ${err?.message || "Failed to generate QR"}`);
    }
  };

  return (
    <>
      <div>
        <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">Program</h1>
        <p className="text-xs text-muted-foreground">Kategori payung event (Ngaji Asyik, AMIDA, dll)</p>
      </div>
      <Section title="Buat Program">
        <form onSubmit={create} className="grid gap-2 sm:gap-3 md:gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Kode</Label><Input required placeholder="NGAJI_ASYIK" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
          <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Nama</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
          <div className="space-y-1.5 md:col-span-2"><Label className="text-xs sm:text-sm">Deskripsi</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Kategori</Label>
            <select className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="single">Sekali pakai</option>
              <option value="episode">Episode</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Batasan Gender</Label>
            <select className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm" value={form.gender_restriction} onChange={(e) => setForm({ ...form, gender_restriction: e.target.value })}>
              <option value="">Umum (semua)</option>
              <option value="L">Khusus Laki-laki</option>
              <option value="P">Khusus Perempuan</option>
            </select>
          </div>
          <div className="md:col-span-2"><Button type="submit" className="w-full bg-primary text-primary-foreground h-9 sm:h-10 text-sm">Buat Program</Button></div>
        </form>
      </Section>

      <Section title="Daftar Program">
        <div className="space-y-2 sm:space-y-3">
          {programs.map((p) => (
            <div key={p.id} className="rounded-xl border border-border/60 p-3 sm:p-4 space-y-3">
              {editProgramId === p.id ? (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
                    <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Nama</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="text-sm h-9 sm:h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Kategori</Label>
                      <select className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                        <option value="single">Sekali pakai</option>
                        <option value="episode">Episode</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2"><Label className="text-xs sm:text-sm">Deskripsi</Label><Textarea rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs sm:text-sm">Batasan Gender</Label>
                      <select className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm" value={editForm.gender_restriction} onChange={(e) => setEditForm({ ...editForm, gender_restriction: e.target.value })}>
                        <option value="">Umum (semua)</option>
                        <option value="L">Khusus Laki-laki</option>
                        <option value="P">Khusus Perempuan</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" size="sm" className="bg-primary text-primary-foreground" onClick={() => save(p.id)}>Simpan</Button>
                    <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>Batal</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base">{p.name} <span className="ml-1 text-xs text-muted-foreground">({p.code})</span></h3>
                      {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                      <div className="mt-1 flex flex-wrap gap-1 text-xs">
                        <span className="rounded bg-muted px-2 py-0.5">{p.category === "episode" ? "Episode" : "Sekali pakai"}</span>
                        {p.gender_restriction ? <span className="rounded bg-destructive/15 px-2 py-0.5 text-destructive">khusus {p.gender_restriction === "P" ? "perempuan" : "laki-laki"}</span> : <span className="rounded bg-muted px-2 py-0.5">umum</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => showQR(p)} className="h-8 w-8 p-0"><QrIcon className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => startEdit(p)} className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => remove(p.id)} className="h-8 w-8 p-0"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {qr?.id === p.id && (
                    <div className="mt-3 sm:mt-4 flex flex-col items-center gap-2 rounded-lg bg-muted/30 p-3">
                      <img src={qr.url} alt="QR Program" className="rounded-lg w-32 h-32 sm:w-40 sm:h-40" />
                      <a href={qr.url} download={`qr-program-${p.code}.png`} className="text-xs text-accent hover:underline">Download QR Program</a>
                      <p className="text-[11px] sm:text-xs text-muted-foreground text-center">Scan QR ini → otomatis dicatat ke event aktif program ini</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
