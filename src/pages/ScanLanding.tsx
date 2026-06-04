import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";

/**
 * Halaman yang dibuka ketika user scan QR event dari kamera HP / Google Lens.
 * URL: /scan?e=<eventId>&t=<token>  (atau /scan?p=<programId>&t=<token>)
 *
 * Alur:
 * 1. Belum login → simpan URL ke sessionStorage lalu arahkan ke /auth.
 * 2. Sudah login tapi profil belum lengkap → arahkan ke /profil.
 * 3. Sudah lengkap → panggil RPC record_attendance, lalu pindah ke halaman sukses.
 */
export default function ScanLanding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [eventIdForRetry, setEventIdForRetry] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ran = useRef(false);

  const token = params.get("t") ?? "";
  const eventId = params.get("e");
  const programId = params.get("p");

  const retry = useCallback(() => {
    ran.current = false;
    setError(null);
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (loading || ran.current) return;
    // Tunggu profil siap kalau user sudah login — hindari race condition
    if (user && !profile) return;
    if (!token || (!eventId && !programId)) {
      setError("QR tidak valid atau sudah kedaluwarsa.");
      ran.current = true;
      return;
    }

    // Belum login → simpan tujuan & arahkan ke /auth
    if (!user) {
      try {
        sessionStorage.setItem(
          "postLoginRedirect",
          `/scan?${params.toString()}`,
        );
      } catch {}
      toast.info("Masuk dulu untuk mencatat kehadiran kamu.");
      navigate("/auth", { replace: true });
      return;
    }

    // Profil belum lengkap
    if (profile && !profile.is_complete) {
      try {
        sessionStorage.setItem(
          "postLoginRedirect",
          `/scan?${params.toString()}`,
        );
      } catch {}
      toast.info("Lengkapi profil dulu sebelum absen.");
      navigate("/profil", { replace: true });
      return;
    }

    ran.current = true;
    (async () => {
      try {
        // Resolve event_id rujukan: kalau hanya program QR, ambil satu event apa pun dari program tsb.
        let evId = eventId;
        if (!evId && programId) {
          const { data: anyEv, error: lookupErr } = await supabase
            .from("events")
            .select("id")
            .eq("program_id", programId)
            .limit(1)
            .maybeSingle();
          if (lookupErr) throw lookupErr;
          evId = anyEv?.id ?? null;
          if (!evId) {
            setError("Program belum memiliki event terdaftar.");
            ran.current = false;
            return;
          }
        }
        setEventIdForRetry(evId);

        const { data: evid, error: rpcErr } = await supabase.rpc(
          "record_attendance",
          { _event_id: evId!, _token: token },
        );
        if (rpcErr) {
          if (rpcErr.code === "23505" || /duplicate/i.test(rpcErr.message)) {
            toast.info("Kamu sudah absen sebelumnya");
            navigate(`/event/${evid ?? evId}/sukses`, { replace: true });
            return;
          }
          setError(rpcErr.message || "Gagal mencatat kehadiran.");
          ran.current = false;
          return;
        }
        // Navigasi dulu — refresh profil di background, jangan blokir UI
        navigate(`/event/${evid ?? evId}/sukses`, { replace: true });
        refreshProfile().catch(() => {});
      } catch (e: any) {
        console.error("[ScanLanding] error:", e);
        setError(e?.message || "Terjadi kesalahan. Silakan coba lagi.");
        ran.current = false;
      }
    })();
  }, [loading, user, profile, token, eventId, programId, navigate, params, refreshProfile, attempt]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-md py-12">
        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-3 font-display text-xl font-bold">
              Tidak bisa mencatat kehadiran
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={retry} className="bg-primary text-primary-foreground">
                Coba lagi
              </Button>
              {eventIdForRetry && (
                <Button asChild variant="outline">
                  <Link to={`/event/${eventIdForRetry}`}>Lihat detail event</Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link to="/">Kembali ke beranda</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h1 className="font-display text-xl font-bold">
              Memproses absensi…
            </h1>
            <p className="text-sm text-muted-foreground">
              Mohon tunggu sebentar.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}