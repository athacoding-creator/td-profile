import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";

export default function SettingsPage() {
  const { settings, setSettings } = useAdmin();
  const save = async () => {
    const { error } = await supabase.from("app_settings").upsert([
      { key: "profile_complete_bonus", value: Number(settings.profile_complete_bonus) },
      { key: "default_attendance_points", value: Number(settings.default_attendance_points) },
    ], { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Pengaturan tersimpan");
  };
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
    </>
  );
}
