import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ChevronLeft, CreditCard, Info, MessageCircle, CheckCircle2, Heart, Coins, Star } from "lucide-react";
import { toast } from "sonner";

export default function Payment() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, proofFile: null as File | null, donorMessage: "" });
  const [infaqType, setInfaqType] = useState<"money" | "prayer">("money");
  const [settings, setSettings] = useState<any>({});

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
      
      const isOnline = !!eventData.is_online;
      // Default amount: for online, it must be >= min_infaq. For offline infaq, it can be 0 if prayer is chosen.
      const defaultAmount = eventData.registration_type === "paid"
        ? eventData.price
        : (eventData.min_infaq || 0);
      
      setPaymentForm(prev => ({
        ...prev,
        amount: defaultAmount
      }));

      if (user) {
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

      // Load payment method
      if (eventData.payment_method_id) {
        const { data: pmData } = await supabase
          .from("payment_methods")
          .select("*")
          .eq("id", eventData.payment_method_id)
          .maybeSingle();
        setPaymentMethod(pmData);
      } else {
        const category = eventData.is_online
          ? "infaq"
          : eventData.registration_type === "paid"
            ? "paid"
            : eventData.registration_type === "infaq"
              ? "infaq"
              : null;
        
        if (category) {
          const { data: qrisData } = await supabase
            .from("qris_methods")
            .select("*")
            .eq("category", category)
            .eq("is_active", true)
            .order("order_index", { ascending: true })
            .limit(1)
            .maybeSingle();
          
          if (qrisData) {
            setPaymentMethod({
              id: qrisData.id,
              name: qrisData.name,
              type: "qris",
              qr_url: qrisData.qr_url,
              description: qrisData.description,
            });
          }
        }
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
  }, [id, user, navigate]);

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

  const submitPayment = async () => {
    if (!paymentForm.proofFile) return toast.error("Upload bukti pembayaran terlebih dahulu");
    
    setSubmitting(true);
    try {
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
        amount_paid: paymentForm.amount,
        payment_proof_url: publicUrl,
        paid_at: new Date().toISOString(),
        donor_message: paymentForm.donorMessage?.trim() ? paymentForm.donorMessage.trim().slice(0, 500) : null,
      };

      if (registration) {
        const { error } = await (supabase.from("registrations") as any).update(updateData).eq("id", registration.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("registrations") as any).insert({
          ...updateData,
          event_id: event.id,
          user_id: user?.id
        });
        if (error) throw error;
      }

      toast.success("Bukti pembayaran berhasil diunggah!");
      const whatsappNumber = settings.admin_wa_number || "085111514040";
      const template = settings.wa_verification_template || "Halo Admin, saya sudah melakukan pembayaran untuk event {{event_title}}. Berikut bukti pembayarannya. Mohon bantuannya untuk diverifikasi. Terima kasih.";
      const whatsappMessage = template.replace("{{event_title}}", event.title);
      window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container py-20 text-center text-muted-foreground">Memuat…</div>;

  const isOnline = registration?.attendance_mode === "online";
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
      const msg = infaqType === "prayer" && paymentForm.donorMessage?.trim() ? paymentForm.donorMessage.trim().slice(0, 500) : (infaqType === "money" ? (paymentForm.donorMessage?.trim() ? paymentForm.donorMessage.trim().slice(0, 500) : null) : null);
      
      const updateData = {
        payment_status: "none",
        amount_paid: amount,
        paid_at: new Date().toISOString(),
        donor_message: msg,
      };

      if (registration) {
        await (supabase.from("registrations") as any).update(updateData).eq("id", registration.id);
      } else {
        await (supabase.from("registrations") as any).insert({
          ...updateData,
          event_id: event.id,
          user_id: user?.id,
          attendance_mode: isOnline ? "online" : "offline"
        });
      }

      if (infaqType === "money") {
        const waNumber = settings.admin_wa_number || "085111514040";
        const infaqMsg = isOnline
          ? `Assalamu'alaikum Admin, saya sudah berinfaq Rp ${amount.toLocaleString("id-ID")} untuk kajian online "${event?.title}". Mohon kontennya bisa saya akses. Terima kasih.`
          : `Assalamu'alaikum Admin, saya ingin berinfaq untuk "${event?.title}" sebesar Rp ${amount.toLocaleString("id-ID")}. Mohon konfirmasinya, terima kasih.`;
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
                <div className="rounded-2xl border-4 border-white bg-white p-2 shadow-md">
                  <img src={paymentMethod.qr_url} alt="QRIS Infaq" className="w-48 h-48 sm:w-64 sm:h-64 object-contain" />
                </div>
                <div className="flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1.5 text-xs font-medium text-rose-700 border border-rose-100">
                  <Info className="h-3 w-3" /> Scan QR di atas dengan aplikasi favoritmu.
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

            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 border border-blue-100">
              <Info className="h-3 w-3 inline mr-1" />
              {infaqType === "money" 
                ? "Infaq Anda sangat membantu operasional dakwah kami. Terima kasih! Nominal bebas sesuai kemampuan." 
                : "Doa yang tulus adalah hadiah yang sangat berharga. Terima kasih telah mendukung kami dengan doa terbaik!"}
            </div>
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
                <div className="rounded-2xl border-4 border-white bg-white p-2 shadow-md">
                  <img src={paymentMethod.qr_url} alt="QRIS" className="w-48 h-48 sm:w-64 sm:h-64 object-contain" />
                </div>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">Rp {event.price?.toLocaleString("id-ID")}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Nominal Tetap</p>
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
