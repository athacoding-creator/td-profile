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
    admin_wa_number_paid: "",
    admin_wa_number_infaq: ""
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
      { key: "admin_wa_number_paid", value: waSettings.admin_wa_number_paid },
      { key: "admin_wa_number_infaq", value: waSettings.admin_wa_number_infaq },
    ], { onConflict: "key" });

    if (err1 || err2) return toast.error(err1?.message || err2?.message);
    toast.success("Pengaturan tersimpan");
  };

  if (loading) return <div className="text-center text-muted-foreground">Memuat...</div>;

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Atur poin & konfigurasi global</p>
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nomor WA Admin (Paid)</Label>
              <Input 
                value={waSettings.admin_wa_number_paid}
                placeholder="+6282136031995"
                onChange={(e) => setWaSettings({ ...waSettings, admin_wa_number_paid: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor WA Admin (Infaq/Free)</Label>
              <Input 
                value={waSettings.admin_wa_number_infaq}
                placeholder="+6285171577665"
                onChange={(e) => setWaSettings({ ...waSettings, admin_wa_number_infaq: e.target.value })} 
              />
            </div>
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

      <Section title="Perhatian">
        <h1 className="font-display text-3xl font-bold mt-1">Info Website</h1>
        <p className="text-sm text-muted-foreground mb-4">Jika Terjadi Error Hubungi Admin atau Tim Development yg bertanggung jawab</p>
      </Section>
    </>
  );
}
