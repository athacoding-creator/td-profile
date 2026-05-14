import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

export default function ScanQR() {
  const { id } = useParams();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    supabase.from("events").select("*").eq("id", id).maybeSingle().then(({ data }) => setEvent(data));
  }, [id]);

  const validate = async (token: string) => {
    if (!event || !user) return;
    let eventId = event.id;
    if (token !== event.qr_token) {
      const { data: resolved } = await supabase.rpc("find_active_event_by_program_token", { _token: token });
      if (resolved) eventId = resolved as string;
      else { toast.error("QR tidak valid atau program belum dimulai"); return; }
    }
    const { error } = await supabase.from("attendance").insert({ event_id: eventId, user_id: user.id });
    if (error) {
      if (error.code === "23505") toast.info("Kamu sudah absen sebelumnya");
      else toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Absensi tercatat!");
    navigate("/poin");
  };

  const start = async () => {
    setScanning(true);
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decoded) => {
          await scanner.stop();
          setScanning(false);
          validate(decoded);
        },
        () => {},
      );
    } catch (e: any) {
      toast.error("Tidak bisa akses kamera: " + e.message);
      setScanning(false);
    }
  };

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-md py-8">
        <h1 className="font-display text-2xl font-bold">Scan QR Absensi</h1>
        <p className="mt-2 text-sm text-muted-foreground">{event?.title}</p>
        <div id="qr-reader" className="mt-6 overflow-hidden rounded-2xl bg-card" />
        {!scanning && (
          <Button onClick={start} className="mt-6 w-full bg-primary text-primary-foreground">
            Mulai Scan
          </Button>
        )}
        <div className="mt-6 text-xs text-muted-foreground">
          Atau masukkan kode manual:
          <ManualInput onSubmit={validate} />
        </div>
      </main>
    </div>
  );
}

function ManualInput({ onSubmit }: { onSubmit: (t: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        placeholder="Token QR"
      />
      <Button onClick={() => onSubmit(val)} variant="outline" size="sm">OK</Button>
    </div>
  );
}
