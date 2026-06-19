import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { MapPin, Calendar, Users, Lock, Link2, ChevronLeft, Upload, ChevronDown, ChevronUp, Info, MessageCircle, CreditCard, Landmark, Wallet, Video } from "lucide-react";
import { YoutubeEmbed } from "@/components/YoutubeEmbed";
import DonorWall from "@/components/DonorWall";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { computeScanWindow, isRecurring, describeRecurring } from "@/lib/eventSchedule";

export default function EventDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, proofFile: null as File | null });
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(0);
  const [showVideoAfterInfaq, setShowVideoAfterInfaq] = useState(() => {
    if (!id) return false;
    const stored = localStorage.getItem(`video_unlocked_${id}`);
    return stored === "true";
  });

  useEffect(() => {
    if (showVideoAfterInfaq && id) {
      localStorage.setItem(`video_unlocked_${id}`, "true");
    }
  }, [showVideoAfterInfaq, id]);

  useEffect(() => {
    if (!event) return;
    const urls = Array.isArray(event.episode_youtube_urls) ? event.episode_youtube_urls : [];
    const firstIndex = urls.findIndex((url: string) => !!url);
    if (firstIndex >= 0) setSelectedEpisode(firstIndex);
  }, [event]);

  useEffect(() => {
    (async () => {
      let eventData: any = null;
      const { data, error } = await supabase.from("events")
        .select("id,title,description,venue,city,starts_at,ends_at,status,gender,event_type,poster_url,group_link,points_reward,program_id,created_at,is_pinned,is_recurring,recurring_days,recurring_start_time,recurring_end_time,recurring_until,registration_type,price,min_infaq,max_infaq,speaker,payment_method_id,is_online,youtube_url,episode_count,episode_youtube_urls, programs(category,name,code)")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("loadEvent error", error);
        const { data: fallbackData, error: fallbackError } = await supabase.from("events")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (fallbackError) {
          console.error("loadEvent fallback error", fallbackError);
          setLoading(false);
          return;
        }
        eventData = fallbackData;
      } else {
        eventData = data;
      }
      setEvent(eventData);

      if (eventData?.payment_method_id) {
        const { data: pmData, error: pmError } = await supabase
          .from("payment_methods")
          .select("*")
          .eq("id", eventData.payment_method_id)
          .maybeSingle();
        if (pmError) {
          console.error("loadPaymentMethod error", pmError);
        }
        setPaymentMethod(pmData ?? null);
      } else {
        // Get QRIS from qris_methods table based on event registration type
        const category = eventData.registration_type === "paid" ? "paid" : eventData.registration_type === "infaq" ? "infaq" : null;
        
        if (category) {
          const { data: qrisData } = await supabase
            .from("qris_methods")
            .select("*")
            .eq("category", category)
            .eq("is_active", true)
            .order("order_index", { ascending: true })
            .maybeSingle();
          
          if (qrisData) {
            setPaymentMethod({
              id: qrisData.id,
              name: qrisData.name,
              type: "qris",
              qr_url: qrisData.qr_url,
              description: qrisData.description,
            });
          } else {
            setPaymentMethod(null);
          }
        } else {
          setPaymentMethod(null);
        }
      }

      if (user && eventData) {
        const { data: r } = await supabase
          .from("registrations")
          .select("*")
          .eq("event_id", eventData.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setRegistration(r || null);
        const { data: a } = await supabase
          .from("attendance")
          .select("*")
          .eq("event_id", eventData.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setAttendance(a || null);
      }

      setLoading(false);
    })();
  }, [id, user]);

  const handleRegisterClick = () => {
    if (!user) return navigate("/auth");
    if (!profile?.is_complete) {
      toast.error("Lengkapi profil dulu di halaman Profil.");
      return navigate("/profil");
    }

    if (genderMismatch) {
      toast.error(`Maaf, event ini khusus untuk ${event.gender === "L" ? "Laki-laki" : "Perempuan"}.`);
      return;
    }

    if (sw.expired && !event.is_online) {
      toast.error("Pendaftaran sudah ditutup karena acara sudah selesai.");
      return;
    }

    register();
  };

  const register = async () => {
    setSubmitting(true);
    try {
      const isInfaq = event.registration_type === "infaq";
      const isPaid = event.registration_type === "paid";
      const payment_status = event.registration_type === "free" ? "none" : isInfaq ? "none" : "pending";
      const amount_paid = isPaid ? event.price : isInfaq ? (event.min_infaq || 0) : 0;

      const { error } = await supabase.from("registrations").insert({
        event_id: event.id,
        user_id: user.id,
        payment_status,
        amount_paid,
        attendance_mode: "offline"
      });
      setSubmitting(false);
      if (error) throw error;

      setRegistration({
        event_id: event.id,
        user_id: user.id,
        payment_status,
        amount_paid,
        attendance_mode: "offline"
      });

      if (event.registration_type === "free") {
        toast.success(event.is_online ? "Pendaftaran berhasil! Akses video tersedia di halaman event." : "Pendaftaran offline berhasil!");
      } else if (isInfaq) {
        toast.success(event.is_online ? "Pendaftaran berhasil! Silakan berinfaq untuk membuka akses video." : "Pendaftaran berhasil! Silakan pilih infaq uang atau doa terbaik.");
        navigate(`/event/${event.id}/bayar`);
      } else {
        toast.success("Pendaftaran berhasil! Silakan upload bukti pembayaran.");
        navigate(`/event/${event.id}/bayar`);
      }
    } catch (error: any) {
      setSubmitting(false);
      toast.error(error.message);
    }
  };

  const submitPayment = async () => {
    if (!paymentForm.proofFile) {
      return toast.error("Upload bukti pembayaran terlebih dahulu");
    }
    if (paymentForm.amount < (event.registration_type === "infaq" ? event.min_infaq : event.price)) {
      return toast.error(`Nominal minimal Rp ${(event.registration_type === "infaq" ? event.min_infaq : event.price).toLocaleString("id-ID")}`);
    }
    if (event.registration_type === "infaq" && paymentForm.amount > event.max_infaq) {
      return toast.error(`Nominal maksimal Rp ${event.max_infaq.toLocaleString("id-ID")}`);
    }

    setSubmitting(true);
    try {
      // Convert image to WEBP
      const webpFile = await convertToWebP(paymentForm.proofFile);
      
      // Upload proof image
      const fileName = `${user?.id}/${event.id}/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("payment_proofs")
        .upload(fileName, webpFile);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment_proofs")
        .getPublicUrl(fileName);

      // Create or update registration
      if (registration) {
        const { error } = await supabase.from("registrations").update({
          payment_status: "pending",
          amount_paid: paymentForm.amount,
          payment_proof_url: publicUrl,
          paid_at: new Date().toISOString()
        }).eq("id", registration.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("registrations").insert({
          event_id: event.id,
          user_id: user.id,
          payment_status: "pending",
          amount_paid: paymentForm.amount,
          payment_proof_url: publicUrl,
          paid_at: new Date().toISOString()
        });
        if (error) throw error;
      }

      setSubmitting(false);
      setShowPaymentForm(false);
      setRegistration({ ...registration, payment_status: "pending", amount_paid: paymentForm.amount, payment_proof_url: publicUrl });
      toast.success("Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.");
    } catch (error: any) {
      setSubmitting(false);
      toast.error(error.message);
    }
  };

  if (loading) return <div className="container py-20 text-center text-muted-foreground">Memuat…</div>;
  if (!event) return <div className="container py-20 text-center">Event tidak ditemukan</div>;

  const genderMismatch =
    user && profile?.gender && event.gender !== "ALL" && event.gender !== profile.gender;
  const sw = computeScanWindow(event);
  // Untuk online event, abaikan expired status agar video tetap bisa diakses selamanya
  // Namun pendaftaran tetap mengikuti aturan sw.expired kecuali jika is_online aktif
  const expired = event.is_online ? false : sw.expired;
  const scanAvailable = sw.scanAvailable;
  const scanNotYetAvailable = sw.scanNotYetAvailable;
  const scanStartTime = sw.scanStartTime;

  const canShowOnlineVideo =
    event.is_online &&
    (event.registration_type === "free" ||
      event.registration_type === "infaq" ||
      registration?.payment_status === "approved" ||
      showVideoAfterInfaq);

  const episodeList = Array.isArray(event.episode_youtube_urls)
    ? event.episode_youtube_urls.map((url: string, index: number) => ({ index, url })).filter((item) => !!item.url)
    : [];
  const hasEpisodeVideos = episodeList.length > 0;
  const selectedEpisodeUrl = episodeList.find((item) => item.index === selectedEpisode)?.url ?? episodeList[0]?.url ?? null;
  const isEpisodeProgram = event.programs?.category === "episode";
  const showVideoUnlockPrompt =
    event.is_online &&
    registration &&
    !canShowOnlineVideo &&
    event.registration_type === "infaq";
  const userHasScanned = !!attendance?.id;

  const hasVideoUrl = !!event.youtube_url || hasEpisodeVideos;

  const showVideoSection = event.is_online
    ? registration && canShowOnlineVideo
    : registration && userHasScanned && hasVideoUrl;

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="container max-w-3xl py-4 sm:py-8 px-3 sm:px-4">
        <button
          onClick={() => navigate("/")}
          className="mb-4 inline-flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali ke Event
        </button>
        {event.poster_url && (
          <div className="overflow-hidden rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }}>
            <img src={event.poster_url} alt={event.title} className="w-full" />
          </div>
        )}
        <h1 className="mt-4 sm:mt-6 font-display text-2xl sm:text-3xl font-bold text-foreground">{event.title}</h1>
        {event.speaker && (
          <p className="text-accent font-medium mt-1 text-sm sm:text-base">Bersama: {event.speaker}</p>
        )}
        <div className="mt-4 space-y-2 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            {isRecurring(event)
              ? describeRecurring(event)
              : format(new Date(event.starts_at), "EEEE, d MMM yyyy • HH:mm", { locale: idLocale })}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            {event.venue}
            {event.city ? `, ${event.city}` : ""}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            {event.gender === "ALL" ? "Umum (L & P)" : event.gender === "L" ? "Khusus Laki-laki" : "Khusus Perempuan"}
          </div>
          {event.registration_type !== "free" && (
            <div className="flex items-center gap-2 pt-2 text-accent font-semibold">
              {event.registration_type === "paid" 
                ? `💰 Wajib Bayar: Rp ${event.price.toLocaleString("id-ID")}`
                : `🤝 Berinfaq: Rp ${event.min_infaq.toLocaleString("id-ID")} - Rp ${event.max_infaq.toLocaleString("id-ID")}`
              }
            </div>
          )}
        </div>
        {event.description && (
          <p className="mt-6 whitespace-pre-line text-foreground/80 text-sm">{event.description}</p>
        )}

        <div className="mt-6 sm:mt-8 space-y-3">
          {registration ? (
            <>
              {/* Status terdaftar */}
              <div className="rounded-xl bg-accent/10 p-4 text-center font-semibold text-accent text-sm sm:text-base border border-accent/20">
                {event.is_online && canShowOnlineVideo ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-center gap-2">
                      <Video className="h-4 w-4" /> Akses Video Terbuka
                    </div>
                    <p className="text-[11px] font-normal text-accent/80">
                      Kamu bisa menonton video ini berulang kali kapan saja.
                    </p>
                  </div>
                ) : (
                  <>
                    ✓ Kamu sudah terdaftar
                    {event.is_online && " (Akses video)"}
                    {event.registration_type === "paid" && registration.payment_status === "pending" && " (Menunggu verifikasi pembayaran)"}
                    {event.registration_type === "paid" && registration.payment_status === "approved" && " (Pembayaran disetujui)"}
                    {event.registration_type === "paid" && registration.payment_status === "rejected" && " (Pembayaran ditolak)"}
                    {showVideoUnlockPrompt && " (Belum Berinfaq)"}
                  </>
                )}
              </div>

              {/* Konten Video Online (Hanya jika unlocked) */}
              {showVideoSection && (
                <div className="mt-4 space-y-3">
                  {hasEpisodeVideos ? (
                    <div className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {episodeList.map((episode) => (
                          <button
                            key={episode.index}
                            type="button"
                            className={`rounded-xl border p-3 text-left text-sm font-medium transition duration-150 ${selectedEpisode === episode.index ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary"}`}
                            onClick={() => setSelectedEpisode(episode.index)}
                          >
                            Episode {episode.index + 1}
                          </button>
                        ))}
                      </div>
                      <div className="rounded-xl border border-border/60 overflow-hidden">
                        <YoutubeEmbed url={selectedEpisodeUrl} title={isEpisodeProgram ? `Episode ${selectedEpisode + 1} • ${event.title}` : event.title} />
                      </div>
                    </div>
                  ) : (
                    <YoutubeEmbed url={event.youtube_url} title={event.title} />
                  )}
                  {event.group_link && (
                    <a href={event.group_link} target="_blank" rel="noreferrer">
                      <Button variant="outline" className="w-full text-sm sm:text-base">
                        <Link2 className="mr-2 h-4 w-4" /> Gabung Grup
                      </Button>
                    </a>
                  )}
                </div>
              )}

              {/* Tombol Buka Video (Hanya jika online mode dan belum unlocked) */}
              {showVideoUnlockPrompt && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <p className="text-[11px] sm:text-xs text-amber-700 leading-relaxed text-center">
                      Silakan berinfaq sukarela untuk membuka akses video rekaman selamanya.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (event.id) {
                        localStorage.setItem(`video_unlocked_${event.id}`, "true");
                        setShowVideoAfterInfaq(true);
                      }
                      navigate(`/event/${event.id}/bayar`);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base font-bold"
                  >
                    💚 Saya Sudah Infaq — Buka Video
                  </Button>
                  {event.group_link && (
                    <a href={event.group_link} target="_blank" rel="noreferrer">
                      <Button variant="outline" className="w-full text-sm sm:text-base">
                        <Link2 className="mr-2 h-4 w-4" /> Gabung Grup
                      </Button>
                    </a>
                  )}
                </div>
              )}

              {/* Tombol bayar HANYA untuk event paid yang belum disetujui (Offline) */}
              {event.registration_type === "paid" && (registration.payment_status === "pending" || registration.payment_status === "rejected") && (
                <Button
                  onClick={() => navigate(`/event/${event.id}/bayar`)}
                  className={`w-full text-white text-sm sm:text-base ${
                    registration.payment_status === "rejected"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {registration.payment_status === "rejected" ? "Kirim Ulang Bukti Pembayaran" : "Upload Bukti Pembayaran"}
                </Button>
              )}

              {/* Infaq sukarela: tombol opsional ke halaman berinfaq via WA (Offline) */}
              {event.registration_type === "infaq" && (
                <Button
                  onClick={() => navigate(`/event/${event.id}/bayar`)}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white text-sm sm:text-base"
                >
                  💝 Berinfaq via WhatsApp (Sukarela)
                </Button>
              )}

              {/* Scan QR untuk free, infaq offline, atau paid yang sudah approved */}
              {!event.is_online && ((registration.payment_status === "none") || (event.registration_type === "paid" && registration.payment_status === "approved")) && (
                <div className="mt-4">
                  {scanAvailable ? (
                    <Link to={`/event/${event.id}/scan`}>
                      <Button className="w-full h-12 font-bold shadow-lg">
                        Scan QR Absensi
                      </Button>
                    </Link>
                  ) : (
                    <div className="rounded-xl bg-muted p-4 text-center text-xs sm:text-sm font-medium text-muted-foreground border border-border">
                      {sw.message ?? "Scan QR tidak tersedia saat ini"}
                    </div>
                  )}
                </div>
              )}

              {event.group_link && (
                <a href={event.group_link} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full text-sm sm:text-base">
                    <Link2 className="mr-2 h-4 w-4" /> Gabung Grup
                  </Button>
                </a>
              )}

              {(event.is_online || event.registration_type === "paid" || event.registration_type === "infaq") && (
                <div className="pt-2">
                  <DonorWall eventId={event.id} />
                </div>
              )}
            </>
          ) : showPaymentForm ? (
            <PaymentForm
              event={event}
              paymentMethod={paymentMethod}
              paymentForm={paymentForm}
              setPaymentForm={setPaymentForm}
              submitting={submitting}
              onSubmit={submitPayment}
              onCancel={() => setShowPaymentForm(false)}
            />
          ) : (
            <Button
              onClick={handleRegisterClick}
              disabled={submitting || genderMismatch || (sw.expired && !event.is_online)}
              className={`w-full text-white text-sm sm:text-base font-bold ${
                (genderMismatch || (sw.expired && !event.is_online))
                  ? "bg-muted text-muted-foreground cursor-not-allowed" 
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {submitting 
                ? "Mendaftarkan…" 
                : !user 
                  ? "Login untuk Daftar" 
                  : genderMismatch
                    ? "Gender Tidak Sesuai"
                    : sw.expired 
                      ? (event.is_online ? "Daftar Online (Akses Video)" : "Pendaftaran Ditutup")
                      : "Daftar Event"
              }
            </Button>
          )}
        </div>

        {/* Mode Selector Modal */}
      </main>
      <BottomNav />
    </div>
  );
}

// Helper function to convert image to WEBP
async function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Could not convert to WEBP"));
            }
          },
          "image/webp",
          0.8
        );
      };
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function PaymentForm({ event, paymentMethod, paymentForm, setPaymentForm, submitting, onSubmit, onCancel }: any) {
  const isPaid = event.registration_type === "paid";
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const whatsappNumber = "085111514040";
  const whatsappMessage = `Halo, saya sudah mengunggah bukti pembayaran untuk event "${event.title}". Nominal: Rp ${paymentForm.amount.toLocaleString("id-ID")}. Mohon diverifikasi. Terima kasih.`;

  const paymentSteps = [
    {
      number: 1,
      title: `Simpan detail ${paymentMethod?.type === 'qris' ? 'QRIS' : 'pembayaran'} yang tertera di atas.`,
      description: "Screenshot atau simpan gambarnya."
    },
    {
      number: 2,
      title: `Buka aplikasi m-banking atau e-wallet (GoPay, OVO, Dana, ShopeePay, dll.)`,
      description: "Pilih menu bayar atau transfer."
    },
    {
      number: 3,
      title: paymentMethod?.type === 'qris' ? 'Pilih menu "Scan QR" atau "Bayar" lalu arahkan kamera ke QR Code di atas.' : `Transfer ke ${paymentMethod?.bank_name || 'Bank'} ${paymentMethod?.account_number || ''} a/n ${paymentMethod?.account_name || ''}`,
      description: "Pastikan data penerima sesuai."
    },
    {
      number: 4,
      title: `Masukkan nominal ${event.registration_type === 'paid' ? 'pembayaran' : 'infaq'} sesuai yang tertera, lalu konfirmasi pembayaran.`,
      description: "Jangan sampai salah nominal."
    },
    {
      number: 5,
      title: `Setelah berhasil, simpan screenshot/bukti pembayaran dari aplikasi Anda.`,
      description: "Penting untuk verifikasi."
    },
    {
      number: 6,
      title: `Upload bukti pembayaran di kolom di bawah, lalu klik Konfirmasi Pembayaran.`,
      description: "Proses selesai!"
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="font-display text-lg sm:text-xl font-bold">Pembayaran Event</h2>
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs sm:text-sm">Batal</Button>
      </div>

      <div className="space-y-4">
        {paymentMethod ? (
          <div className="flex flex-col items-center gap-4 rounded-xl bg-muted/30 p-4 border border-border/40">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {paymentMethod.type === 'qris' ? <CreditCard className="h-3 w-3" /> : paymentMethod.type === 'bank_transfer' ? <Landmark className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
              {paymentMethod.name}
            </div>
            
            {paymentMethod.type === 'qris' && paymentMethod.qr_url && (
              <div className="rounded-2xl border-4 border-white bg-white p-2 shadow-md">
                <img src={paymentMethod.qr_url} alt="QRIS" className="w-48 h-48 sm:w-64 sm:h-64 object-contain" />
              </div>
            )}

            {paymentMethod.type !== 'qris' && (
              <div className="w-full space-y-2 text-center">
                <p className="text-lg font-bold text-primary">{paymentMethod.bank_name}</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-mono font-bold tracking-wider">{paymentMethod.account_number}</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    navigator.clipboard.writeText(paymentMethod.account_number);
                    toast.success("Nomor rekening disalin");
                  }}>
                    <Upload className="h-3 w-3 rotate-90" />
                  </Button>
                </div>
                <p className="text-sm font-medium">a/n {paymentMethod.account_name}</p>
              </div>
            )}

            {paymentMethod.description && (
              <p className="text-center text-[10px] sm:text-xs text-muted-foreground italic max-w-xs">
                {paymentMethod.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-[10px] sm:text-xs font-medium text-amber-700 border border-amber-100">
              <Info className="h-3 w-3" /> Scan/Bayar sekarang dengan aplikasi e-wallet/m-banking Anda.
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-destructive/10 p-4 text-center text-xs text-destructive">
            Metode pembayaran belum dikonfigurasi oleh admin.
          </div>
        )}

        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="bg-muted/50 p-3 flex items-center gap-2 border-b">
            <Info className="h-4 w-4 text-accent" />
            <span className="text-xs sm:text-sm font-bold">Instruksi Pembayaran</span>
          </div>
          <div className="divide-y divide-border/40">
            <div className="p-1">
              <button 
                onClick={() => setExpandedStep(expandedStep === 1 ? null : 1)}
                className="w-full flex items-center justify-between p-2 hover:bg-muted/30 transition-colors"
              >
                <span className="text-xs sm:text-sm font-semibold">Cara Bayar via {paymentMethod?.type?.toUpperCase() || 'Metode Pembayaran'}</span>
                {expandedStep === 1 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedStep === 1 && (
                <div className="px-3 pb-4 pt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {paymentSteps.map((step) => (
                    <div key={step.number} className="flex gap-3">
                      <div className="flex-shrink-0 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-accent text-[10px] sm:text-xs font-bold text-white">
                        {step.number}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[11px] sm:text-xs font-medium leading-relaxed">{step.title}</p>
                        <p className="text-[10px] text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 rounded-lg bg-amber-50 p-3 border border-amber-100">
                    <p className="text-[10px] leading-relaxed text-amber-800">
                      💡 Pembayaran Anda akan diverifikasi admin dalam 1x24 jam. Jika ada kendala, hubungi kami via tombol <strong>Chat WA</strong> di bawah.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-semibold">Nominal Pembayaran (Rp)</Label>
            <Input
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
              disabled={isPaid}
              className={`text-sm sm:text-base h-10 sm:h-12 bg-muted/20 ${isPaid ? 'opacity-70 font-bold text-primary cursor-not-allowed' : ''}`}
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
              {isPaid ? "💰 Nominal Tetap" : "🤝 Nominal Infaq (Bebas)"}: Rp {paymentForm.amount.toLocaleString("id-ID")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-semibold">Upload Bukti Pembayaran</Label>
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPaymentForm({ ...paymentForm, proofFile: e.target.files?.[0] || null })}
                className="text-xs sm:text-sm h-10 sm:h-12 flex items-center py-2"
              />
              <p className="text-[10px] text-muted-foreground italic">Format: JPG, PNG, WEBP (Maks 5MB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              onClick={onSubmit}
              disabled={submitting || !paymentForm.proofFile}
              className="w-full bg-primary text-primary-foreground h-10 sm:h-12 text-sm sm:text-base font-bold shadow-md"
            >
              {submitting ? "Mengirim..." : "✓ Konfirmasi Pembayaran"}
            </Button>
            <a 
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full"
            >
              <Button
                variant="outline"
                className="w-full border-green-600 text-green-600 hover:bg-green-50 h-10 sm:h-12 text-sm sm:text-base font-bold"
              >
                <MessageCircle className="mr-2 h-4 w-4" /> Chat WA Admin
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
