import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ChevronLeft, CreditCard, Info, MessageCircle, CheckCircle2, Heart, Coins, Star, Download, Smartphone, Wallet, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { resolveEventQris } from "@/lib/resolveQris";

export default function Payment() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  type Guest = { guest_name: string; guest_phone: string; guest_gender: "L" | "P"; registered_by: string };
  const paymentState = location.state as { guest?: Guest; guests?: Guest[]; includeSelf?: boolean; position?: string; positionPrice?: number } | null;
  const guests = paymentState?.guests ?? (paymentState?.guest ? [paymentState.guest] : []);
  const isGuestRegistration = guests.length > 0;
  const includeSelf = paymentState?.includeSelf ?? false;
  const participantCount = Math.max(guests.length + (includeSelf ? 1 : 0), 1);
  const [event, setEvent] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, proofFile: null as File | null, donorMessage: "" });
  const [infaqType, setInfaqType] = useState<"money" | "prayer">("money");
  const [settings, setSettings] = useState<any>({});
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const selectedPosition = paymentState?.position;

  useEffect(() => {
    (async () => {
      if (!id) return;
      
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle() as any;

      if (eventError || !eventData) {
        toast.error("Event tidak ditemukan");
        navigate("/");
        return;
      }
      setEvent(eventData);
      let sportPositionPrice: number | null = null;
      if (["futsal", "mini-soccer"].includes(eventData.event_type)) {
        if (!selectedPosition) {
          toast.error("Pilih posisi terlebih dahulu.");
          navigate(`/event/${id}`);
          return;
        }
        const { data: positionData } = await supabase
          .from("event_position_pricing")
          .select("price")
          .eq("event_id", id)
          .eq("position", selectedPosition)
          .eq("is_active", true)
          .maybeSingle();
        if (!positionData) {
          toast.error("Posisi yang dipilih tidak tersedia.");
          navigate(`/event/${id}`);
          return;
        }
        sportPositionPrice = Number(positionData.price);
      }
      
      const isOnline = !!eventData.is_online;
      // Default amount: for online, it must be >= min_infaq. For offline infaq, it can be 0 if prayer is chosen.
      const defaultAmount = eventData.registration_type === "paid"
        ? (sportPositionPrice ?? eventData.price) * participantCount
        : (eventData.min_infaq || 0) * participantCount;
      
      setPaymentForm(prev => ({
        ...prev,
        amount: defaultAmount
      }));

      if (user && !isGuestRegistration) {
        const { data: regData } = await supabase
          .from("registrations")
          .select("*")
          .eq("event_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        setRegistration(regData);
        if (regData?.amount_paid) {
          setPaymentForm(prev => ({ ...prev, amount: regData.amount_paid }));
          if (regData.amount_paid > 0) setInfaqType("money");
          else if (regData.donor_message) setInfaqType("prayer");
        }
      }

      // Load QRIS: pilihan event -> kategori event -> kategori bawaan
      try {
        const qris = await resolveEventQris(eventData);
        setPaymentMethod(qris);
        if (!qris) {
          toast.error("QRIS untuk kategori pembayaran event ini belum tersedia. Hubungi admin.");
        }
      } catch (err) {
        console.error("resolveEventQris error", err);
        setPaymentMethod(null);
      }

      const { data: settingsData } = await supabase
        .from("donation_settings")
        .select("key, value");
      
      if (settingsData) {
        const s: any = {};
        settingsData.forEach(item => s[item.key] = item.value);
        setSettings(s);
      }

      setLoading(false);
    })();
  }, [id, user, navigate, isGuestRegistration, participantCount, selectedPosition]);

  const convertToWebP = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Could not get canvas context"));
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Conversion failed")), "image/webp", 0.8);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const downloadQR = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.appendChild(link);
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("QR Code berhasil diunduh");
    } catch (error) {
      console.error("Download error:", error);
      // Fallback if fetch fails (e.g. CORS)
      window.open(url, "_blank");
    }
  };

  const ensureQuota = async (needed: number) => {
    if (!event?.max_participants) return true;
    const { data, error } = await supabase.rpc("event_registration_count", { _event_id: event.id });
    if (error) {
      toast.error(error.message);
      return false;
    }
    const used = typeof data === "number" ? data : 0;
    if (used + needed > event.max_participants) {
      toast.error("Maaf, kuota peserta untuk event ini sudah penuh.");
      return false;
    }
    return true;
  };

  const submitPayment = async () => {
    if (!paymentForm.proofFile) return toast.error("Upload bukti pembayaran terlebih dahulu");
    
    setSubmitting(true);
    try {
      if (!registration && !(await ensureQuota(participantCount))) {
        setSubmitting(false);
        return;
      }
      const webpFile = await convertToWebP(paymentForm.proofFile);
      const fileName = `${user?.id}/${event.id}/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("payment_proofs")
        .upload(fileName, webpFile);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment_proofs")
        .getPublicUrl(fileName);

      const updateData = {
        payment_status: "pending",
        amount_paid: paymentForm.amount / participantCount,
        payment_proof_url: publicUrl,
        paid_at: new Date().toISOString(),
        donor_message: paymentForm.donorMessage?.trim() ? paymentForm.donorMessage.trim().slice(0, 500) : null,
        position: selectedPosition || null,
      };

      if (registration) {
        const { error } = await (supabase.from("registrations") as any).update(updateData).eq("id", registration.id);
        if (error) throw error;
      } else {
        const records = isGuestRegistration
          ? [
              ...(includeSelf ? [{ ...updateData, event_id: event.id, user_id: user?.id, registered_by: user?.id }] : []),
              ...guests.map((guest) => ({ ...updateData, event_id: event.id, user_id: null, ...guest })),
            ]
          : [{ ...updateData, event_id: event.id, user_id: user?.id, registered_by: user?.id }];
        const { error } = await (supabase.from("registrations") as any).insert(records);
        if (error) throw error;
      }

      toast.success("Bukti pembayaran berhasil diunggah!");
      const whatsappNumber = paymentMethod?.whatsapp_number
        ? paymentMethod.whatsapp_number.replace(/[^0-9]/g, "")
        : selectedPosition
        ? "6285111514040"
        : event.registration_type === "paid"
        ? (settings.admin_wa_number_paid || "+6282136031995")
        : (settings.admin_wa_number_infaq || "+6285171577665");
      const template = settings.wa_verification_template || "Halo Admin, saya sudah melakukan pembayaran untuk event {{event_title}}. Berikut bukti pembayarannya. Mohon bantuannya untuk diverifikasi. Terima kasih.";
      const whatsappMessage = selectedPosition
        ? `Halo Admin, saya ${profile?.full_name || "peserta"} sudah melakukan pembayaran untuk event ${event.title}. Posisi: ${selectedPosition}. Nominal: Rp ${paymentForm.amount.toLocaleString("id-ID")}. Mohon diverifikasi. Terima kasih.`
        : template.replace("{{event_title}}", event.title);
      setSettings((current: any) => ({ ...current, pendingWhatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}` }));
      setPaymentSuccess(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="container max-w-3xl py-4 px-3">
        <Skeleton className="mb-4 h-6 w-32 rounded" />
        <div className="space-y-6 rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm">
          <div className="border-b pb-4">
            <Skeleton className="h-6 w-1/2 rounded" />
            <Skeleton className="mt-2 h-4 w-3/4 rounded" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-64 w-64 rounded-2xl" />
            <Skeleton className="h-10 w-48 rounded" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/4 rounded" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );

  if (paymentSuccess) return (
    <div className="min-h-screen bg-background pb-32"><Header /><main className="container max-w-3xl py-4 px-3">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center space-y-4">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h1 className="font-display text-xl font-bold text-green-800">Pendaftaran Berhasil!</h1>
        <p className="text-sm text-green-700">Bukti pembayaran telah diunggah dan menunggu verifikasi admin.</p>
        {selectedPosition && <p className="text-sm">Posisi: <strong>{selectedPosition}</strong> · Rp {paymentForm.amount.toLocaleString("id-ID")}</p>}
        <a href={settings.pendingWhatsappUrl} target="_blank" rel="noopener noreferrer"><Button className="w-full bg-green-600 hover:bg-green-700"><MessageCircle className="mr-2 h-4 w-4" />Konfirmasi via WhatsApp</Button></a>
        <Button variant="outline" className="w-full" onClick={() => navigate(`/event/${id}`)}>Kembali ke detail event</Button>
      </div>
    </main><BottomNav /></div>
  );

  // Check if event is expired to determine if it should be treated as online access
  const isExpired = event ? (
    event.is_recurring 
      ? (event.recurring_until ? new Date(event.recurring_until + "T23:59:59").getTime() < Date.now() : false)
      : (new Date(event.ends_at || new Date(new Date(event.starts_at).getTime() + 6 * 3600 * 1000)).getTime() < Date.now())
  ) : false;

  const isOnline = registration?.attendance_mode === "online" || (isExpired && !event?.is_online);
  const isInfaq = event?.registration_type === "infaq" || isOnline;
  const isPaid = event?.registration_type === "paid" && !isOnline;
  const alreadyApproved = isPaid && registration?.payment_status === "approved";

  const handleInfaqSubmit = async () => {
    if (infaqType === "prayer" && !paymentForm.donorMessage.trim()) {
      return toast.error("Silakan tulis doa terbaikmu terlebih dahulu");
    }

    setSubmitting(true);
    try {
      const amount = infaqType === "money" ? (Number(paymentForm.amount) || 0) : 0;
      if (!registration && !(await ensureQuota(participantCount))) {
        setSubmitting(false);
        return;
      }
      const msg = infaqType === "prayer" && paymentForm.donorMessage?.trim() ? paymentForm.donorMessage.trim().slice(0, 500) : (infaqType === "money" ? (paymentForm.donorMessage?.trim() ? paymentForm.donorMessage.trim().slice(0, 500) : null) : null);
      
      const updateData = {
        payment_status: "none",
        amount_paid: amount,
        paid_at: new Date().toISOString(),
        donor_message: msg,
        position: selectedPosition || null,
      };

      if (registration) {
        const { error } = await (supabase.from("registrations") as any).update(updateData).eq("id", registration.id);
        if (error) throw error;
      } else {
        const records = isGuestRegistration
          ? [
              ...(includeSelf ? [{ ...updateData, amount_paid: amount / participantCount, event_id: event.id, user_id: user?.id, registered_by: user?.id, attendance_mode: (isOnline || isExpired) ? "online" : "offline" }] : []),
              ...guests.map((guest) => ({ ...updateData, amount_paid: amount / participantCount, event_id: event.id, user_id: null, ...guest, attendance_mode: (isOnline || isExpired) ? "online" : "offline" })),
            ]
          : [{ ...updateData, event_id: event.id, user_id: user?.id, registered_by: user?.id, attendance_mode: (isOnline || isExpired) ? "online" : "offline" }];
        const { error } = await (supabase.from("registrations") as any).insert(records);
        if (error) throw error;
      }

      if (infaqType === "money") {
        const waNumber = event.registration_type === "paid" 
          ? (settings.admin_wa_number_paid || "+6282136031995")
          : (settings.admin_wa_number_infaq || "+6285171577665");
        const infaqMsg = isOnline
          ? `Assalamu'alaikum Admin, saya sudah berinfaq Rp ${amount.toLocaleString("id-ID")} untuk kajian online "${event?.title}". Mohon kontennya bisa saya akses. Terima kasih.`
          : `Assalamu'alaikum Kak

          Bismillah, saya ingin berinfaq untuk "${event?.title}" sebesar Rp ${amount.toLocaleString("id-ID")}.

          Semoga Allah menjadikan infaq ini sebagai pemberat timbangan amal, pembuka pintu rezeki yang halal dan berkah, serta sebab datangnya hidayah dan keteguhan hati dalam mencintai-Nya. Aamiin. 🤲🏻`;
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(infaqMsg)}`, "_blank", "noopener,noreferrer");
      }

      toast.success(infaqType === "money" ? "Pendaftaran berhasil! Silakan konfirmasi via WA." : "Terima kasih atas doa terbaiknya! Pendaftaran berhasil.");
      if (isOnline) navigate(`/event/${event.id}`);
      else navigate("/riwayat");
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal memproses pendaftaran");
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadyApproved) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <Header />
        <main className="container max-w-3xl py-4 px-3">
          <button onClick={() => navigate(`/event/${id}`)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Kembali ke Detail Event
          </button>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="font-display text-xl font-bold text-green-800">Pembayaran Sudah Dikonfirmasi</h2>
            <p className="text-sm text-green-700">
              Kamu sudah terdaftar &amp; pembayaran kamu untuk <strong>{event.title}</strong> telah disetujui admin.
            </p>
            <Button onClick={() => navigate(`/event/${id}`)} className="mt-2">Kembali ke Detail Event</Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (isInfaq) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <Header />
        <main className="container max-w-3xl py-4 px-3">
          <button onClick={() => navigate(`/event/${id}`)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Kembali ke Detail Event
          </button>

          <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm">
            <div className="border-b pb-4">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-rose-500" /> Pendaftaran: {event.title}
              </h2>
              {selectedPosition && <p className="mt-1 text-sm text-muted-foreground">Posisi: {selectedPosition}</p>}
              {isGuestRegistration && <p className="mt-1 text-sm text-muted-foreground">Peserta: {guests.map((guest) => `${guest.guest_name} (${guest.guest_phone})`).join(", ")}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                {isOnline 
                  ? "Khusus pendaftaran online, silakan berinfaq untuk mengakses video kajian selamanya." 
                  : "Infaq Anda sangat membantu operasional dakwah kami. Nominal bebas sesuai kemampuan."}
              </p>
            </div>



            {paymentMethod?.qr_url && (
              <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/30 p-4 border border-border/40">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                  <CreditCard className="h-3 w-3" /> {paymentMethod.name}
                </div>
                <div className="rounded-2xl border-4 border-white bg-white p-2 shadow-md relative group">
                  <img src={paymentMethod.qr_url} alt="QRIS Infaq" className="w-48 h-48 sm:w-64 sm:h-64 object-contain" />
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 text-xs h-9 border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={() => downloadQR(paymentMethod.qr_url, `QRIS_Infaq_${event.title}`)}
                >
                  <Download className="h-4 w-4" /> Simpan / Download QR
                </Button>

                {/* Tutorial Pembayaran */}
                <div className="w-full mt-2 space-y-3 bg-white/50 rounded-xl p-4 border border-border/40">
                  <p className="text-xs font-bold flex items-center gap-2 text-foreground">
                    <Smartphone className="h-4 w-4 text-accent" /> Cara Pembayaran QRIS:
                  </p>
                  <div className="space-y-3">
                    {[
                      { step: 1, text: "Simpan/Download gambar QR Code di atas.", icon: <Download className="h-3 w-3" /> },
                      { step: 2, text: "Buka aplikasi Mobile Banking atau E-Wallet (GoPay, OVO, Dana, dll).", icon: <Wallet className="h-3 w-3" /> },
                      { step: 3, text: "Pilih menu 'Scan' atau 'Bayar', lalu klik ikon 'Galeri' untuk memilih gambar QR yang tadi di-download.", icon: <Check className="h-3 w-3" /> },
                      { step: 4, text: "Masukkan nominal, konfirmasi nama 'TERAS DAKWAH', dan selesaikan pembayaran.", icon: <CheckCircle2 className="h-3 w-3" /> }
                    ].map((item) => (
                      <div key={item.step} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {item.step}
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Pilih Nominal (Rp)</Label>
              <div className="flex flex-col gap-2">
                {[50000, 20000, 10000, 5000].map((amt) => (
                  <Button
                    key={amt}
                    variant={paymentForm.amount === amt && infaqType === "money" ? "default" : "outline"}
                    className={`h-12 text-sm font-bold w-full ${paymentForm.amount === amt && infaqType === "money" ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : 'border-border'}`}
                    onClick={() => {
                      setInfaqType("money");
                      setPaymentForm({ ...paymentForm, amount: amt });
                    }}
                  >
                    Rp {amt.toLocaleString("id-ID")}
                  </Button>
                ))}
                <Button
                  variant={infaqType === "prayer" ? "default" : "outline"}
                  className={`h-12 text-sm font-bold w-full ${infaqType === "prayer" ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : 'border-border'}`}
                  onClick={() => {
                    setInfaqType("prayer");
                    setPaymentForm({ ...paymentForm, amount: 0 });
                  }}
                >
                  Doa Terbaik
                </Button>
              </div>
            </div>



            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {infaqType === "prayer" ? "Tulis Doa Terbaikmu" : "Pesan / Doa Terbaikmu (Opsional)"}
              </Label>
              <Textarea
                value={paymentForm.donorMessage}
                onChange={(e) => setPaymentForm({ ...paymentForm, donorMessage: e.target.value.slice(0, 500) })}
                placeholder={infaqType === "prayer" ? "Tuliskan doa terbaikmu di sini..." : "Contoh: Semoga ilmunya bermanfaat dan berkah untuk semua 🤲"}
                rows={3}
                maxLength={500}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground text-right">{paymentForm.donorMessage.length}/500</p>
            </div>

            <Button 
              onClick={handleInfaqSubmit} 
              disabled={submitting}
              className={`w-full h-12 font-bold ${infaqType === "money" ? "bg-green-600 hover:bg-green-700" : "bg-rose-500 hover:bg-rose-600"}`}
            >
              {submitting ? "Memproses..." : (infaqType === "money" ? (isOnline ? "Saya Sudah Infaq — Buka Video" : "Konfirmasi Infaq via WhatsApp") : "Kirim Doa & Scan QR Sekarang")}
            </Button>

          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="container max-w-3xl py-4 px-3">
        <button onClick={() => navigate(`/event/${id}`)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Kembali ke Detail Event
        </button>

        <div className="space-y-6 rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm">
          <div className="border-b pb-4">
            <h2 className="font-display text-xl font-bold">Pembayaran: {event.title}</h2>
            {isGuestRegistration && <p className="mt-1 text-sm text-muted-foreground">Peserta: {guests.map((guest) => `${guest.guest_name} (${guest.guest_phone})`).join(", ")}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Silakan selesaikan pembayaran untuk mengonfirmasi pendaftaran Anda.
            </p>
          </div>

          {paymentMethod ? (
            <div className="flex flex-col items-center gap-4 rounded-xl bg-muted/30 p-4 border border-border/40">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <CreditCard className="h-3 w-3" /> {paymentMethod.name}
              </div>
              {paymentMethod.qr_url && (
                <>
                  <div className="rounded-2xl border-4 border-white bg-white p-2 shadow-md">
                    <img src={paymentMethod.qr_url} alt="QRIS" className="w-48 h-48 sm:w-64 sm:h-64 object-contain" />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2 text-xs h-9 border-primary/20 text-primary hover:bg-primary/5"
                    onClick={() => downloadQR(paymentMethod.qr_url, `QRIS_Bayar_${event.title}`)}
                  >
                    <Download className="h-4 w-4" /> Simpan / Download QR
                  </Button>

                  {/* Tutorial Pembayaran */}
                  <div className="w-full mt-2 space-y-3 bg-white/50 rounded-xl p-4 border border-border/40">
                    <p className="text-xs font-bold flex items-center gap-2 text-foreground">
                      <Smartphone className="h-4 w-4 text-accent" /> Cara Pembayaran QRIS:
                    </p>
                    <div className="space-y-3">
                      {[
                        { step: 1, text: "Simpan/Download gambar QR Code di atas.", icon: <Download className="h-3 w-3" /> },
                        { step: 2, text: "Buka aplikasi Mobile Banking atau E-Wallet (GoPay, OVO, Dana, dll).", icon: <Wallet className="h-3 w-3" /> },
                        { step: 3, text: "Pilih menu 'Scan' atau 'Bayar', lalu klik ikon 'Galeri' untuk memilih gambar QR yang tadi di-download.", icon: <Check className="h-3 w-3" /> },
                        { step: 4, text: "Masukkan nominal, konfirmasi nama 'TERAS DAKWAH', dan selesaikan pembayaran.", icon: <CheckCircle2 className="h-3 w-3" /> }
                      ].map((item) => (
                        <div key={item.step} className="flex gap-3 items-start">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold mt-0.5">
                            {item.step}
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">Rp {(event.price * participantCount)?.toLocaleString("id-ID")}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Nominal tetap untuk {participantCount} peserta</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-destructive/10 p-4 text-center text-xs text-destructive">
              Metode pembayaran belum dikonfigurasi.
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Upload Bukti Pembayaran</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPaymentForm({ ...paymentForm, proofFile: e.target.files?.[0] || null })}
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Pesan / Doa Terbaikmu (Opsional)</Label>
              <Textarea
                value={paymentForm.donorMessage}
                onChange={(e) => setPaymentForm({ ...paymentForm, donorMessage: e.target.value.slice(0, 500) })}
                placeholder="Tulis pesan atau doa Anda di sini..."
                rows={3}
                maxLength={500}
                className="text-sm"
              />
            </div>

            <Button
              onClick={submitPayment}
              disabled={submitting || !paymentForm.proofFile}
              className="w-full h-12 font-bold shadow-lg"
            >
              {submitting ? "Mengirim..." : "✓ Konfirmasi Pembayaran"}
            </Button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
