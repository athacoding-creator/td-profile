import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, StopCircle } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";

export default function ScanPage() {
  const { events } = useAdmin();
  const [searchParams] = useSearchParams();
  const [eventId, setEventId] = useState<string>(searchParams.get("eventId") || "");
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeEvents = events.filter((e) => e.status === "active");

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  const handleToken = async (token: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return toast.error("Pilih event dulu");
    const userId = token.trim();
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return toast.error("QR tidak valid");
    const { error } = await supabase.from("attendance").insert({ event_id: ev.id, user_id: userId });
    if (error) {
      if (error.code === "23505") toast.info("User sudah absen");
      else toast.error(error.message);
      return;
    }
    toast.success(`Absensi tercatat (+${ev.points_reward} pts)`);
  };

  const start = async () => {
    if (!eventId) return toast.error("Pilih event dulu");
    setScanning(true);
    const scanner = new Html5Qrcode("admin-qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
        async (decoded) => { await handleToken(decoded); }, () => {});
    } catch (e: any) { toast.error("Tidak bisa akses kamera: " + e.message); setScanning(false); }
  };
  const stop = async () => { await scannerRef.current?.stop().catch(() => {}); scannerRef.current = null; setScanning(false); };

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Scan QR Admin</h1>
        <p className="text-sm text-muted-foreground">Untuk intervensi manual / mencatat kehadiran user</p>
      </div>
      <Section title="Scanner">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label>Event aktif</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">— pilih event —</option>
              {activeEvents.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.points_reward} pts)</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            {!scanning
              ? <Button onClick={start} className="bg-primary text-primary-foreground"><Camera className="mr-2 h-4 w-4" />Mulai</Button>
              : <Button onClick={stop} variant="outline"><StopCircle className="mr-2 h-4 w-4" />Stop</Button>}
          </div>
        </div>
        <div id="admin-qr-reader" className="mt-4 overflow-hidden rounded-2xl bg-muted" />
        <div className="mt-4 flex gap-2">
          <Input placeholder="atau tempel user ID manual" value={manual} onChange={(e) => setManual(e.target.value)} />
          <Button variant="outline" onClick={() => handleToken(manual)}>OK</Button>
        </div>
      </Section>
    </>
  );
}
