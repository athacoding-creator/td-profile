import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";
import { ImagePicker } from "@/components/admin/ImagePicker";

export default function SettingsPage() {
  const { settings, setSettings } = useAdmin();
  const [qrisUrl, setQrisUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQris();
  }, []);

  const loadQris = async () => {
    const { data } = await supabase.from("donation_settings").select("value").eq("key", "qris_url").maybeSingle();
    if (data?.value) setQrisUrl(data.value);
    setLoading(false);
  };

  const save = async () => {
    const { error } = await supabase.from("app_settings").upsert([
      { key: "profile_complete_bonus", value: Number(settings.profile_complete_bonus) },
      { key: "default_attendance_points", value: Number(settings.default_attendance_points) },
    ], { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Pengaturan tersimpan");
  };

  const saveQris = async () => {
    const { error } = await supabase.from("donation_settings").upsert(
      { key: "qris_url", value: qrisUrl },
      { onConflict: "key" }
    );
    if (error) return toast.error(error.message);
    toast.success("QRIS berhasil disimpan");
  };

  const deleteQris = async () => {
    if (!confirm("Hapus QRIS?")) return;
    const { error } = await supabase.from("donation_settings").update({ value: "" }).eq("key", "qris_url");
    if (error) return toast.error(error.message);
    setQrisUrl("");
    toast.success("QRIS dihapus");
  };

  if (loading) return <div className="text-center text-muted-foreground">Memuat...</div>;

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Atur poin, QRIS & konfigurasi global (realtime)</p>
      </div>
      <Section title="Pengaturan Poin">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Bonus lengkapi data profil</Label>
            <Input type="number" value={settings.profile_complete_bonus}
              onChange={(e) => setSettings({ ...settings, profile_complete_bonus: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Default poin scan QR kehadiran</Label>
            <Input type="number" value={settings.default_attendance_points}
              onChange={(e) => setSettings({ ...settings, default_attendance_points: Number(e.target.value) })} />
          </div>
        </div>
        <Button onClick={save} className="mt-4 bg-primary text-primary-foreground">
          <Save className="mr-2 h-4 w-4" /> Simpan
        </Button>
      </Section>

      <Section title="QRIS Donasi & Pembayaran">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Upload QRIS Image</Label>
            <ImagePicker bucket="qris" value={qrisUrl} onChange={(url) => setQrisUrl(url)} />
          </div>
          {qrisUrl && (
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs font-medium mb-2 text-muted-foreground">Preview QRIS</p>
              <img src={qrisUrl} alt="QRIS" className="max-w-xs rounded-lg" />
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={saveQris} className="bg-primary text-primary-foreground">
              <Save className="mr-2 h-4 w-4" /> Simpan QRIS
            </Button>
            {qrisUrl && (
              <Button onClick={deleteQris} variant="outline" className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Hapus
              </Button>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
