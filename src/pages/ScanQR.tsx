import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { ChevronLeft } from "lucide-react";
import { parseScannedQr } from "@/lib/qrUrl";

export default function ScanQR() {
  const { id } = useParams();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [now, setNow] = useState(new Date());
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    supabase.from("events")
      .select("id,title,venue,starts_at,ends_at,status,points_reward,program_id")
      .eq("id", id).maybeSingle().then(({ data }) => setEvent(data));
  }, [id]);

  const getScanStatus = () => {
    if (!event) return null;
    const startTime = new Date(event.starts_at);
    const endTime = event.ends_at ? new Date(event.ends_at) : new Date(startTime.getTime() + 6 * 60 * 60 * 1000);

    const scanStartTime = new Date(startTime.getTime() - 6 * 60 * 60 * 1000);

    if (now < scanStartTime) {
      return { allowed: false, message: "Scan belum dibuka (dibuka 6 jam sebelum acara)" };
    }
    if (now > endTime) {
      return { allowed: false, message: "Event sudah selesai" };
    }
    return { allowed: true };
  };

  const validate = async (raw: string) => {
    if (!event || !user) return;
    const { token } = parseScannedQr(raw);
    if (!token) return toast.error("QR tidak valid");
    const { data: evid, error } = await supabase.rpc("record_attendance", { _event_id: event.id, _token: token });
    if (error) {
      if (error.code === "23505" || /duplicate/i.test(error.message)) toast.info("Kamu sudah absen sebelumnya");
      else toast.error(error.message);
      return;
    }
    await refreshProfile();
    navigate(`/event/${evid ?? event.id}/sukses`);
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

  const scanStatus = getScanStatus();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-md py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali
        </button>
        <h1 className="font-display text-2xl font-bold">Scan QR Absensi</h1>
        <p className="mt-2 text-sm text-muted-foreground">{event?.title}</p>
        {scanStatus && !scanStatus.allowed && (
          <div className="mt-4 rounded-lg bg-amber-50 p-4 text-center text-sm text-amber-800 border border-amber-200">
            {scanStatus.message}
          </div>
        )}
        <div id="qr-reader" className="mt-6 overflow-hidden rounded-2xl bg-card" />
        {!scanning && (
          <Button onClick={start} disabled={scanStatus && !scanStatus.allowed} className="mt-6 w-full bg-primary text-primary-foreground">
            Mulai Scan
          </Button>
        )}
        {scanStatus?.allowed && (
          <div className="mt-6 text-xs text-muted-foreground">
            Atau masukkan kode manual:
            <ManualInput onSubmit={validate} />
          </div>
        )}
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
