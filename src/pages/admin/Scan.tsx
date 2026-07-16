import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, StopCircle, CheckCircle2, XCircle, Info } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";
import { isEventExpired } from "@/lib/eventSchedule";

type ScanEntry = {
  time: string;
  status: "ok" | "dup" | "error";
  name?: string;
  message: string;
};

export default function ScanPage() {
  const { events } = useAdmin();
  const [searchParams] = useSearchParams();
  const [eventId, setEventId] = useState<string>(searchParams.get("eventId") || "");
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ token: string; at: number }>({ token: "", at: 0 });
  const activeEvents = events.filter((e) => e.status === "active" && !isEventExpired(e));

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  const pushHistory = (entry: ScanEntry) =>
    setHistory((prev) => [entry, ...prev].slice(0, 20));

  const handleToken = async (rawToken: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return toast.error("Pilih event dulu");
    const userId = rawToken.trim();
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      toast.error("QR tidak valid");
      return;
    }

    // Debounce: cegah scan berulang QR yg sama dalam 3 detik
    const now = Date.now();
    if (lastScanRef.current.token === userId && now - lastScanRef.current.at < 3000) return;
    lastScanRef.current = { token: userId, at: now };

    const time = new Date().toLocaleTimeString("id-ID");

    // Ambil nama user utk feedback
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const name = prof?.full_name || "Jamaah";

    // Wajib sudah terdaftar di event
    const { data: reg } = await supabase
      .from("registrations")
      .select("id, payment_status")
      .eq("event_id", ev.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!reg) {
      const msg = `${name} belum mendaftar event ini`;
      toast.error(msg);
      pushHistory({ time, status: "error", name, message: "Belum daftar — scan ditolak" });
      return;
    }

    if ((ev as any).registration_type === "paid" && reg.payment_status !== "approved") {
      const msg = `Pembayaran ${name} belum diverifikasi`;
      toast.error(msg);
      pushHistory({ time, status: "error", name, message: "Pembayaran belum diverifikasi" });
      return;
    }

    const { error } = await supabase
      .from("attendance")
      .insert({ event_id: ev.id, user_id: userId });

    if (error) {
      if (error.code === "23505") {
        toast.info(`${name} sudah absen`);
        pushHistory({ time, status: "dup", name, message: "Sudah absen sebelumnya" });
      } else {
        toast.error(error.message);
        pushHistory({ time, status: "error", name, message: error.message });
      }
      return;
    }
    toast.success(`✅ ${name} hadir (+${ev.points_reward} pts)`);
    pushHistory({ time, status: "ok", name, message: `+${ev.points_reward} poin` });
  };

  const start = async () => {
    if (!eventId) return toast.error("Pilih event dulu");
    setScanning(true);
    const scanner = new Html5Qrcode("admin-qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decoded) => { await handleToken(decoded); },
        () => {},
      );
    } catch (e: any) {
      toast.error("Tidak bisa akses kamera: " + e.message);
      setScanning(false);
    }
  };
  const stop = async () => {
    await scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setScanning(false);
  };

  const submitManual = async () => {
    if (!manual.trim()) return;
    await handleToken(manual);
    setManual("");
  };

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Scan QR Kehadiran</h1>
        <p className="text-sm text-muted-foreground">
          Scan QR jamaah yang muncul di halaman <strong>Profil → QR Kehadiran saya</strong>
        </p>
      </div>

      <Section title="Scanner">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label>Event aktif</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">— pilih event —</option>
              {activeEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.points_reward} pts)
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            {!scanning ? (
              <Button onClick={start} className="bg-primary text-primary-foreground">
                <Camera className="mr-2 h-4 w-4" />
                Mulai
              </Button>
            ) : (
              <Button onClick={stop} variant="outline">
                <StopCircle className="mr-2 h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </div>

        <div id="admin-qr-reader" className="mt-4 overflow-hidden rounded-2xl bg-muted" />

        <div className="mt-4 flex gap-2">
          <Input
            placeholder="atau tempel User ID manual (UUID)"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
          />
          <Button variant="outline" onClick={submitManual}>OK</Button>
        </div>
      </Section>

      {history.length > 0 && (
        <Section title="Riwayat scan (sesi ini)">
          <ul className="divide-y divide-border">
            {history.map((h, i) => (
              <li key={i} className="flex items-center gap-3 py-2">
                {h.status === "ok" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                {h.status === "dup" && <Info className="h-5 w-5 text-amber-600" />}
                {h.status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{h.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{h.message}</div>
                </div>
                <div className="text-xs text-muted-foreground">{h.time}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Cara Pakai (Tutorial Admin)">
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
            <span>Pilih <strong>Event aktif</strong> yang sedang berlangsung dari dropdown di atas.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
            <span>Tekan tombol <strong>Mulai</strong> dan izinkan akses kamera pada browser.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
            <span>Minta jamaah membuka <strong>Profil → QR Kehadiran saya</strong> di aplikasi mereka.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">4</span>
            <span>Arahkan kamera ke QR jamaah. Kehadiran otomatis tercatat dan poin ditambahkan.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">5</span>
            <span>Jika kamera bermasalah, jamaah bisa memberitahu <strong>User ID</strong> (tombol <em>Salin</em> di halaman QR) lalu tempel di kolom manual.</span>
          </li>
        </ol>
        <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          <strong>Catatan:</strong> Satu jamaah hanya bisa absen 1x per event. Sistem akan memberi tahu jika QR sudah pernah discan. QR jamaah bersifat pribadi (User ID), tidak berubah, jadi bisa disimpan di HP masing-masing.
        </div>
      </Section>
    </>
  );
}
