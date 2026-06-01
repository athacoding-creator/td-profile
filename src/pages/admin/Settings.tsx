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

  const [waSettings, setWaSettings] = useState({
    wa_verification_template: "",
    admin_wa_number: ""
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("donation_settings").select("key, value");
      if (data) {
        const s: any = { ...waSettings };
        data.forEach(item => s[item.key] = item.value);
        setWaSettings(s);
      }
    })();
  }, []);

  const save = async () => {
    const { error: err1 } = await supabase.from("app_settings").upsert([
      { key: "profile_complete_bonus", value: Number(settings.profile_complete_bonus) },
      { key: "default_attendance_points", value: Number(settings.default_attendance_points) },
    ], { onConflict: "key" });
    
    const { error: err2 } = await supabase.from("donation_settings").upsert([
      { key: "wa_verification_template", value: waSettings.wa_verification_template },
      { key: "admin_wa_number", value: waSettings.admin_wa_number },
    ], { onConflict: "key" });

    if (err1 || err2) return toast.error(err1?.message || err2?.message);
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

      <Section title="Template Chat WA Verifikasi">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nomor WA Admin (dengan kode negara, misal: 628123...)</Label>
            <Input 
              value={waSettings.admin_wa_number}
              onChange={(e) => setWaSettings({ ...waSettings, admin_wa_number: e.target.value })} 
            />
          </div>
          <div className="space-y-1.5">
            <Label>Template Pesan (Gunakan {"{{event_title}}"} untuk judul event)</Label>
            <textarea 
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={waSettings.wa_verification_template}
              onChange={(e) => setWaSettings({ ...waSettings, wa_verification_template: e.target.value })}
            />
          </div>
          <Button onClick={save} className="bg-primary text-primary-foreground">
            <Save className="mr-2 h-4 w-4" /> Simpan Template
          </Button>
        </div>
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
