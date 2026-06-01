import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Info } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { settings, setSettings } = useAdmin();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const save = async () => {
    const { error } = await supabase.from("app_settings").upsert([
      { key: "profile_complete_bonus", value: Number(settings.profile_complete_bonus) },
      { key: "default_attendance_points", value: Number(settings.default_attendance_points) },
    ], { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Pengaturan tersimpan");
  };

  if (loading) return <div className="text-center text-muted-foreground">Memuat...</div>;

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Atur poin & konfigurasi global (realtime)</p>
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
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-blue-900">QRIS Manager</p>
              <p className="text-xs text-blue-800 mt-1">
                Kelola QRIS untuk pembayaran dan infaq telah dipindahkan ke halaman khusus QRIS Manager.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/qris')}
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            Buka QRIS Manager →
          </Button>
        </div>
      </Section>
    </>
  );
}
