import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import QRCode from "qrcode";
import { QrCode as QrIcon, Trash2 } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";

export default function ProgramsPage() {
  const { programs } = useAdmin();
  const [form, setForm] = useState<any>({ code: "", name: "", description: "", gender_restriction: "" });
  const [qr, setQr] = useState<{ id: string; url: string } | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("programs").insert({
      code: form.code.toUpperCase().replace(/\s+/g, "_"),
      name: form.name,
      description: form.description || null,
      gender_restriction: form.gender_restriction || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Program dibuat");
    setForm({ code: "", name: "", description: "", gender_restriction: "" });
  };
  const remove = async (id: string) => {
    if (!confirm("Hapus program?")) return;
    await supabase.from("programs").delete().eq("id", id);
  };
  const showQR = async (p: any) => {
    const url = await QRCode.toDataURL(p.qr_token, { width: 400, margin: 2 });
    setQr({ id: p.id, url });
  };

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Program</h1>
        <p className="text-sm text-muted-foreground">Kategori payung event (Ngaji Asyik, AMIDA, dll)</p>
      </div>
      <Section title="Buat Program">
        <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Kode</Label><Input required placeholder="NGAJI_ASYIK" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Nama</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Deskripsi</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Batasan Gender</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.gender_restriction} onChange={(e) => setForm({ ...form, gender_restriction: e.target.value })}>
              <option value="">Umum (semua)</option>
              <option value="L">Khusus Laki-laki</option>
              <option value="P">Khusus Perempuan</option>
            </select>
          </div>
          <div className="md:col-span-2"><Button type="submit" className="w-full bg-primary text-primary-foreground">Buat Program</Button></div>
        </form>
      </Section>

      <Section title="Daftar Program">
        <div className="space-y-3">
          {programs.map((p) => (
            <div key={p.id} className="rounded-xl border border-border/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{p.name} <span className="ml-1 text-xs text-muted-foreground">({p.code})</span></h3>
                  {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                  <p className="mt-1 text-xs">
                    {p.gender_restriction
                      ? <span className="rounded bg-destructive/15 px-2 py-0.5 text-destructive">khusus {p.gender_restriction === "P" ? "perempuan" : "laki-laki"}</span>
                      : <span className="rounded bg-muted px-2 py-0.5">umum</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => showQR(p)}><QrIcon className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              {qr?.id === p.id && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <img src={qr.url} alt="QR Program" className="rounded-lg" />
                  <a href={qr.url} download={`qr-program-${p.code}.png`} className="text-xs text-accent hover:underline">Download QR Program</a>
                  <p className="text-xs text-muted-foreground text-center">Scan QR ini → otomatis dicatat ke event aktif program ini</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
