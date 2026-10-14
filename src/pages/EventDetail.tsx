import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import {MapPin, Calendar, Users, Link2, ChevronLeft, Video} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { YoutubeEmbed } from "@/components/YoutubeEmbed";
import DonorWall from "@/components/DonorWall";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { computeScanWindow, isRecurring, describeRecurring } from "@/lib/eventSchedule";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resolveEventQris } from "@/lib/resolveQris";
import { isPositionEvent, isClassEvent } from "@/lib/eventTypes";
import { PaymentForm } from "./event-detail/PaymentForm";
import { convertToWebP } from "./event-detail/convertToWebP";
import { GroupGuestForm, emptyGuest } from "./event-detail/GroupGuestForm";
import { PositionChoiceDialog } from "./event-detail/PositionChoiceDialog";


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
  const [regCount, setRegCount] = useState<number | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(0);
  const [registrationChoiceOpen, setRegistrationChoiceOpen] = useState(false);
  const [positionChoiceOpen, setPositionChoiceOpen] = useState(false);
  const [positionPricing, setPositionPricing] = useState<{ position: string; price: number; max_slots?: number | null; description?: string | null }[]>([]);
  const [positionCounts, setPositionCounts] = useState<Record<string, number>>({});
  const [pendingPricing, setPendingPricing] = useState<{ position: string; price: number; max_slots?: number | null } | null>(null);
  const [positionGroupOpen, setPositionGroupOpen] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);

  const [guestCount, setGuestCount] = useState(1);
  const [guests, setGuests] = useState([emptyGuest()]);
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
        .select("id,title,description,venue,city,starts_at,ends_at,status,gender,event_type,poster_url,group_link,registration_link,points_reward,program_id,created_at,is_pinned,allow_group_registration,is_recurring,recurring_days,recurring_start_time,recurring_end_time,recurring_until,registration_type,price,min_infaq,max_infaq,max_participants,speaker,payment_category_id,qris_method_id,is_online,youtube_url,episode_count,episode_youtube_urls, programs(category,name,code)")
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

      if (isPositionEvent(eventData?.event_type)) {
        const { data: pricingData, error: pricingError } = await supabase
          .from("event_position_pricing")
          .select("position, price, max_slots, description")
          .eq("event_id", eventData.id)
          .neq("is_active", false)
          .order("created_at");
        if (pricingError) console.error("load position pricing", pricingError);
        setPositionPricing((pricingData as any) ?? []);
        const counts: Record<string, number> = {};
        await Promise.all((pricingData ?? []).map(async (p: any) => {
          const { data: c } = await supabase.rpc("event_position_count", { _event_id: eventData.id, _position: p.position });
          counts[p.position] = typeof c === "number" ? c : 0;
        }));
        setPositionCounts(counts);
      }

      if (eventData) {
        try {
          setPaymentMethod(await resolveEventQris(eventData));
        } catch (err) {
          console.error("resolveEventQris error", err);
          setPaymentMethod(null);
        }
      }

      if (eventData?.id) {
        const { data: countData } = await supabase.rpc("event_registration_count", { _event_id: eventData.id });
        setRegCount(typeof countData === "number" ? countData : null);
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

  const quotaFull = !!event?.max_participants && (regCount ?? 0) >= event.max_participants;

  const checkQuota = async (needed = 1) => {
    if (!event.max_participants) return true;
    const { data, error } = await supabase.rpc("event_registration_count", { _event_id: event.id });
    if (error) throw error;
    const used = typeof data === "number" ? data : 0;
    setRegCount(used);
    if (used + needed > event.max_participants) {
      toast.error("Maaf, kuota peserta untuk event ini sudah penuh.");
      return false;
    }
    return true;
  };

  const handleRegisterClick = () => {
    if (event?.registration_link) {
      window.open(event.registration_link, "_blank", "noopener,noreferrer");
      return;
    }
    if (!user) return navigate("/auth");
    if (event && event.gender !== "ALL" && !computeScanWindow(event).expired && profile?.gender !== event.gender) {
      if (!profile?.gender) {
        toast.error("Lengkapi gender di profil kamu dulu untuk mendaftar event ini.");
        return navigate("/profil");
      }
      return toast.error(`Maaf, event ini khusus untuk ${event.gender === "L" ? "Laki-laki" : "Perempuan"}. Video rekaman bisa diakses setelah event selesai.`);
    }
    if (isPositionEvent(event?.event_type)) {
      if (!positionPricing.length) return toast.error(`Pilihan ${isClassEvent(event?.event_type) ? "kelas" : "posisi"} belum dikonfigurasi oleh admin.`);
      setPositionChoiceOpen(true);
      return;
    }
    setShowGuestForm(false);
    if (event?.allow_group_registration === false) {
      register(true);
      return;
    }
    setRegistrationChoiceOpen(true);
  };

  const selectPosition = async (pricing: { position: string; price: number; max_slots?: number | null; description?: string | null }) => {
    if (quotaFull) return toast.error("Maaf, kuota peserta untuk event ini sudah penuh.");
    if (event.gender !== "ALL" && !computeScanWindow(event).expired && profile?.gender !== event.gender) {
      return toast.error(`Maaf, event ini khusus untuk ${event.gender === "L" ? "Laki-laki" : "Perempuan"}.`);
    }
    try {
      if (!(await checkQuota(1))) return;
      if (pricing.max_slots && pricing.max_slots > 0) {
        const { data: c, error: cErr } = await supabase.rpc("event_position_count", { _event_id: event.id, _position: pricing.position });
        if (cErr) throw cErr;
        const used = typeof c === "number" ? c : 0;
        setPositionCounts((prev) => ({ ...prev, [pricing.position]: used }));
        if (used >= pricing.max_slots) {
          return toast.error(`Kuota ${isClassEvent(event?.event_type) ? "kelas" : "posisi"} ${pricing.position} sudah penuh.`);
        }
      }
    } catch (error: any) {
      return toast.error(error.message);
    }
    setPositionChoiceOpen(false);
    if (event?.allow_group_registration !== false) {
      setPendingPricing(pricing);
      setPositionGroupOpen(true);
      return;
    }
    navigate(`/event/${event.id}/bayar`, { state: { position: pricing.position, positionPrice: Number(pricing.price), isClass: isClassEvent(event?.event_type) } });
  };

  const proceedWithPosition = async (withGuests: boolean) => {
    if (!pendingPricing || !event) return;
    if (withGuests && guests.some((guest) => !guest.name.trim() || !guest.phone.trim() || !guest.gender)) {
      return toast.error("Lengkapi nama, nomor WhatsApp, dan gender semua peserta.");
    }
    const total = withGuests ? 1 + guests.length : 1;
    const participantGenders = [profile?.gender, ...(withGuests ? guests.map((guest) => guest.gender) : [])];
    if (event.gender !== "ALL" && !computeScanWindow(event).expired && participantGenders.some((gender) => gender !== event.gender)) {
      return toast.error(`Maaf, event ini khusus untuk ${event.gender === "L" ? "Laki-laki" : "Perempuan"}.`);
    }
    setSubmitting(true);
    try {
      if (!(await checkQuota(total))) { setSubmitting(false); return; }
      if (pendingPricing.max_slots && pendingPricing.max_slots > 0) {
        const { data: c, error: cErr } = await supabase.rpc("event_position_count", { _event_id: event.id, _position: pendingPricing.position });
        if (cErr) throw cErr;
        const used = typeof c === "number" ? c : 0;
        setPositionCounts((prev) => ({ ...prev, [pendingPricing.position]: used }));
        if (used + total > pendingPricing.max_slots) {
          setSubmitting(false);
          return toast.error(`Sisa kuota ${isClassEvent(event?.event_type) ? "kelas" : "posisi"} ${pendingPricing.position} hanya ${Math.max(pendingPricing.max_slots - used, 0)} peserta.`);
        }
      }
      setPositionGroupOpen(false);
      const guestData = withGuests
        ? guests.map((guest) => ({ guest_name: guest.name.trim(), guest_phone: guest.phone.trim(), guest_gender: guest.gender, registered_by: user.id }))
        : undefined;
      navigate(`/event/${event.id}/bayar`, {
        state: {
          position: pendingPricing.position,
          positionPrice: Number(pendingPricing.price),
          isClass: isClassEvent(event?.event_type),
          ...(guestData ? { guests: guestData, includeSelf: true } : {}),
        },
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const register = async (includeSelf: boolean, includeGuests = false) => {
    if (includeGuests && guests.some((guest) => !guest.name.trim() || !guest.phone.trim() || !guest.gender)) {
      return toast.error("Lengkapi nama, nomor WhatsApp, dan gender semua peserta.");
    }
    const participantGenders = [
      ...(includeSelf ? [profile?.gender] : []),
      ...(includeGuests ? guests.map((guest) => guest.gender) : []),
    ];
    if (event.gender !== "ALL" && !computeScanWindow(event).expired && participantGenders.some((gender) => gender !== event.gender)) {
      return toast.error(`Maaf, event ini khusus untuk ${event.gender === "L" ? "Laki-laki" : "Perempuan"}.`);
    }
    setSubmitting(true);
    try {
      if (!await checkQuota(participantGenders.length)) {
        setSubmitting(false);
        return;
      }
      const isInfaq = event.registration_type === "infaq";
      const isPaid = event.registration_type === "paid";
      const guestData = includeGuests
        ? guests.map((guest) => ({ guest_name: guest.name.trim(), guest_phone: guest.phone.trim(), guest_gender: guest.gender, registered_by: user.id }))
        : [];

      // Untuk infaq / paid: JANGAN insert registrasi dulu.
      // Registrasi baru dibuat setelah user menyelesaikan pilihan di halaman /bayar
      // (submit nominal infaq, doa terbaik, atau upload bukti bayar).
      if (isInfaq || isPaid) {
        setSubmitting(false);
        navigate(`/event/${event.id}/bayar`, { state: includeGuests ? { guests: guestData, includeSelf } : undefined });
        return;
      }

      // Free event: langsung buat registrasi
      const registrations = [
        ...(includeSelf ? [{ event_id: event.id, user_id: user.id, registered_by: user.id, payment_status: "none", amount_paid: 0, attendance_mode: "offline" }] : []),
        ...guestData.map((data) => ({ event_id: event.id, user_id: null, ...data, payment_status: "none", amount_paid: 0, attendance_mode: "offline" })),
      ];
      const { error } = await supabase.from("registrations").insert(registrations);
      setSubmitting(false);
      if (error) throw error;

      if (includeSelf) setRegistration(registrations[0]);
      if (includeGuests) {
        setGuests(Array.from({ length: guestCount }, emptyGuest));
      }
      setRegistrationChoiceOpen(false);

      toast.success(event.is_online ? "Pendaftaran berhasil! Akses video tersedia di halaman event." : "Pendaftaran offline berhasil!");
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

  if (loading) return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="container max-w-3xl py-4 sm:py-8 px-3 sm:px-4">
        <Skeleton className="mb-4 h-6 w-32 rounded" />
        <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: "3/4" }} />
        <Skeleton className="mt-6 h-8 w-3/4 rounded" />
        <Skeleton className="mt-2 h-5 w-1/2 rounded" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>
        <div className="mt-6 space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </main>
      <BottomNav />
    </div>
  );
  if (!event) return <div className="container py-20 text-center">Event tidak ditemukan</div>;

  const genderMismatch =
    user && profile?.gender && event.gender !== "ALL" && event.gender !== profile.gender;
  const sw = computeScanWindow(event);
  // Untuk online event, abaikan expired status agar video tetap bisa diakses selamanya
  // Namun pendaftaran tetap mengikuti aturan sw.expired kecuali jika is_online aktif
  const scanAvailable = sw.scanAvailable;

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

  const showVideoSection = registration && hasVideoUrl && (
    event.is_online 
      ? canShowOnlineVideo 
      : (userHasScanned || (sw.expired && (registration.payment_status === 'none' || registration.payment_status === 'approved')))
  );

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
                ? (isPositionEvent(event.event_type) ? `💰 Wajib Bayar — pilih ${isClassEvent(event.event_type) ? "kelas" : "posisi"} untuk melihat harga` : `💰 Wajib Bayar: Rp ${event.price.toLocaleString("id-ID")}`)
                : `🤝 Berinfaq: Rp ${event.min_infaq.toLocaleString("id-ID")} - Rp ${event.max_infaq.toLocaleString("id-ID")}`
              }
            </div>
          )}
        </div>

        {/* Scan QR diletakkan di sini sesuai permintaan user (di atas deskripsi) */}
        {registration && ((registration.payment_status === "none") || (event.registration_type === "paid" && registration.payment_status === "approved")) && !sw.expired && (
          <div className="mt-4 space-y-2">
            {userHasScanned ? (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-4 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                ✅ Kamu sudah absen untuk event ini
              </div>
            ) : scanAvailable ? (
              <>
                <Link to={`/event/${event.id}/scan`}>
                  <Button className="w-full h-12 font-bold shadow-lg">
                    Scan QR Absensi
                  </Button>
                </Link>
                <p className="text-center text-xs sm:text-sm text-muted-foreground">
                  (untuk menonton online link ada dibawah)
                </p>
              </>
            ) : (
              <div className="rounded-xl bg-muted p-4 text-center text-xs sm:text-sm font-medium text-muted-foreground border border-border">
                {sw.message ?? "Scan QR tidak tersedia saat ini"}
              </div>
            )}
          </div>
        )}

        {event.description && (
          <p className="mt-6 whitespace-pre-line text-foreground/80 text-sm">{event.description}</p>
        )}

        <div className="mt-6 sm:mt-8 space-y-3">
          {registration ? (
            <>
              {/* Status terdaftar */}
              <div className="rounded-xl bg-accent/10 p-4 text-center font-semibold text-accent text-sm sm:text-base border border-accent/20">
                {(event.is_online ? canShowOnlineVideo : (sw.expired && (registration.payment_status === 'none' || registration.payment_status === 'approved'))) ? (
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

                {isPositionEvent(event.event_type) && registration.position && (
                  <div className="mt-3 rounded-lg border border-accent/20 bg-background p-3 text-left">
                    <p className="text-xs text-muted-foreground">
                      {isClassEvent(event.event_type) ? "Kelas yang dipilih" : "Posisi yang dipilih"}
                    </p>
                    <p className="font-semibold text-foreground">{registration.position}</p>
                    {isClassEvent(event.event_type) && (
                      <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                        {positionPricing.find((p) => p.position === registration.position)?.description || "Tidak ada keterangan benefit"}
                      </p>
                    )}
                  </div>
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
            <div className="space-y-2">
              {!!event.max_participants && (
                <p className={`text-xs font-semibold ${quotaFull ? "text-destructive" : "text-muted-foreground"}`}>
                  {quotaFull
                    ? "Kuota peserta sudah penuh"
                    : `Kuota: ${regCount ?? 0}/${event.max_participants} terisi`}
                </p>
              )}
              {genderMismatch && !sw.expired ? (
                <div className="rounded-xl bg-muted p-4 text-center text-xs sm:text-sm font-medium text-muted-foreground border border-border">
                  🔒 Event ini khusus {event.gender === "L" ? "Laki-laki" : "Perempuan"}. Video rekaman bisa diakses setelah event selesai.
                </div>
              ) : (
              <Button
                onClick={handleRegisterClick}
                disabled={submitting || quotaFull}
                className="w-full text-white text-sm sm:text-base font-bold bg-green-600 hover:bg-green-700"
              >
                {submitting
                  ? "Mendaftarkan…"
                  : !user
                    ? "Login untuk Daftar"
                    : quotaFull
                      ? "Kuota Penuh"
                      : sw.expired
                        ? "Buka Akses Video"
                        : "Daftar Event"
                }
              </Button>
              )}
            </div>
          )}
        </div>

        <Dialog open={registrationChoiceOpen} onOpenChange={setRegistrationChoiceOpen}>
          <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
            <DialogHeader><DialogTitle>Pilih peserta</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {!showGuestForm ? <>
                <Button className="w-full" disabled={submitting} onClick={() => register(true)}>
                  Daftar Diri Sendiri
                </Button>
                <Button className="w-full" variant="outline" disabled={submitting} onClick={() => setShowGuestForm(true)}>
                  Daftarkan Rombongan
                </Button>
              </> : <GroupGuestForm profile={profile} guestCount={guestCount} setGuestCount={setGuestCount} guests={guests} setGuests={setGuests} submitting={submitting} onBack={() => setShowGuestForm(false)} onSubmit={() => register(true, true)} />
              }
            </div>
          </DialogContent>
        </Dialog>
        <PositionChoiceDialog open={positionChoiceOpen} onOpenChange={setPositionChoiceOpen} eventType={event.event_type} positionPricing={positionPricing} positionCounts={positionCounts} onSelect={selectPosition} />
        <Dialog open={positionGroupOpen} onOpenChange={(open) => { setPositionGroupOpen(open); if (!open) { setPendingPricing(null); setShowGuestForm(false); } }}>
          <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
            <DialogHeader><DialogTitle>Pilih peserta</DialogTitle></DialogHeader>
            {pendingPricing && (
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                {isClassEvent(event.event_type) ? "Kelas" : "Posisi"}: <span className="font-medium text-foreground">{pendingPricing.position}</span> · Rp {Number(pendingPricing.price).toLocaleString("id-ID")}/peserta
              </p>
            )}
            <div className="space-y-4">
              {!showGuestForm ? <>
                <Button className="w-full" disabled={submitting} onClick={() => proceedWithPosition(false)}>
                  Daftar Diri Sendiri
                </Button>
                <Button className="w-full" variant="outline" disabled={submitting} onClick={() => setShowGuestForm(true)}>
                  Daftarkan Rombongan
                </Button>
              </> : <GroupGuestForm profile={profile} guestCount={guestCount} setGuestCount={setGuestCount} guests={guests} setGuests={setGuests} submitting={submitting} onBack={() => setShowGuestForm(false)} onSubmit={() => proceedWithPosition(true)} />
              }
            </div>
          </DialogContent>
        </Dialog>
      </main>
      <BottomNav />
    </div>
  );
}
