import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { MapPin, Calendar, Users, Lock, Link2, ChevronLeft, Upload, Info, QrCode, CheckCircle2 } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, proofFile: null as File | null });
  const [qrisMethods, setQrisMethods] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("events")
        .select("id,title,description,venue,city,starts_at,ends_at,status,gender,event_type,poster_url,group_link,points_reward,program_id,created_at,is_pinned,is_recurring,recurring_days,recurring_start_time,recurring_end_time,recurring_until,registration_type,price,min_infaq,max_infaq,speaker")
        .eq("id", id).maybeSingle();
      setEvent(data);
      
      // Load QRIS based on event type
      const category = data?.registration_type === "paid" ? "paid" : "infaq";
      const { data: qrisData } = await supabase
        .from("qris_methods")
        .select("*")
        .eq("category", category)
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (qrisData) setQrisMethods(qrisData);
      
      if (user && data) {
        const { data: r } = await supabase
          .from("registrations")
          .select("*")
          .eq("event_id", data.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setRegistration(r || null);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const register = async () => {
    if (!user) return navigate("/auth");
    if (!profile?.is_complete) {
      toast.error("Lengkapi profil dulu di halaman Profil.");
      return navigate("/profil");
    }
    
    if (event.registration_type === "free") {
      setSubmitting(true);
      const { error } = await supabase.from("registrations").insert({ 
        event_id: event.id, 
        user_id: user.id,
        payment_status: "none"
      });
      setSubmitting(false);
      if (error) return toast.error(error.message);
      setRegistration({ event_id: event.id, user_id: user.id, payment_status: "none" });
      toast.success("Pendaftaran berhasil!");
    } else {
      setShowPaymentForm(true);
      setPaymentForm({ 
        amount: event.registration_type === "paid" ? event.price : 5000, 
        proofFile: null 
      });
    }
  };

  const submitPayment = async () => {
    if (!paymentForm.proofFile) {
      return toast.error("Upload bukti pembayaran terlebih dahulu");
    }
    const minRequired = event.registration_type === "infaq" ? 5000 : event.price;
    if (paymentForm.amount < minRequired) {
      return toast.error(`Nominal minimal Rp ${minRequired.toLocaleString("id-ID")}`);
    }

    setSubmitting(true);
    try {
      // Upload proof image
      const fileName = `${user?.id}/${event.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("payment_proofs")
        .upload(fileName, paymentForm.proofFile);
      
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
  const expired = sw.expired;
  const scanAvailable = sw.scanAvailable;
  const scanNotYetAvailable = sw.scanNotYetAvailable;
  const scanStartTime = sw.scanStartTime;

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="container max-w-3xl py-8">
        <button
          onClick={() => navigate("/")}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali ke Event
        </button>
        {event.poster_url && (
          <div className="overflow-hidden rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }}>
            <img src={event.poster_url} alt={event.title} className="w-full" />
          </div>
        )}
        <h1 className="mt-6 font-display text-3xl font-bold text-foreground">{event.title}</h1>
        {event.speaker && (
          <p className="text-accent font-medium mt-1">Bersama: {event.speaker}</p>
        )}
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
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
          <p className="mt-6 whitespace-pre-line text-foreground/80">{event.description}</p>
        )}

        <div className="mt-8 space-y-4">
          {expired ? (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">
              <Lock className="h-4 w-4" /> Event Expired — pendaftaran & absensi ditutup.
            </div>
          ) : genderMismatch ? (
            <div className="flex items-center gap-2 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" /> Event ini tidak sesuai dengan gender profilmu.
            </div>
          ) : registration ? (
            <>
              <div className={`rounded-xl p-4 text-center font-semibold border ${
                registration.payment_status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                registration.payment_status === "approved" ? "bg-green-50 text-green-700 border-green-200" :
                registration.payment_status === "rejected" ? "bg-red-50 text-red-700 border-red-200" :
                "bg-accent/10 text-accent border-accent/20"
              }`}>
                {registration.payment_status === "pending" && "✓ Menunggu verifikasi pembayaran"}
                {registration.payment_status === "approved" && "✓ Pendaftaran Disetujui"}
                {registration.payment_status === "rejected" && "✕ Pembayaran Ditolak"}
                {registration.payment_status === "none" && "✓ Kamu sudah terdaftar"}
              </div>
              
              {registration.payment_status === "rejected" && (
                <Button
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Kirim Ulang Bukti Pembayaran
                </Button>
              )}
              
              {(registration.payment_status === "approved" || registration.payment_status === "none") && (
                <div className="space-y-3">
                  {scanNotYetAvailable ? (
                    <div className="rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-800 border border-amber-200">
                      {sw.message ?? `Scan QR tersedia mulai jam ${scanStartTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
                    </div>
                  ) : scanAvailable ? (
                    <Link to={`/event/${event.id}/scan`}>
                      <Button className="w-full bg-primary text-primary-foreground py-6 text-lg font-bold shadow-lg shadow-primary/20">
                        <QrCode className="mr-2 h-6 w-6" /> Scan QR Absensi
                      </Button>
                    </Link>
                  ) : (
                    <div className="rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">
                      {sw.message ?? "Scan QR sedang tidak tersedia"}
                    </div>
                  )}
                </div>
              )}
              
              {event.group_link && (
                <a href={event.group_link} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full py-5 border-2">
                    <Link2 className="mr-2 h-4 w-4" /> Gabung Grup WhatsApp
                  </Button>
                </a>
              )}
            </>
          ) : showPaymentForm ? (
            <PaymentForm 
              event={event} 
              qrisMethods={qrisMethods} 
              paymentForm={paymentForm} 
              setPaymentForm={setPaymentForm} 
              submitting={submitting} 
              onSubmit={submitPayment} 
              onCancel={() => setShowPaymentForm(false)} 
            />
          ) : (
            <Button
              onClick={register}
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground py-6 text-lg font-bold shadow-lg shadow-primary/20"
            >
              {submitting ? "Mendaftarkan…" : user ? "Daftar Sekarang" : "Login untuk Daftar"}
            </Button>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function PaymentForm({ event, qrisMethods, paymentForm, setPaymentForm, submitting, onSubmit, onCancel }: any) {
  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 sm:p-6 space-y-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center space-y-1">
        <h3 className="font-display text-xl font-bold">
          {event.registration_type === "paid" ? "Selesaikan Pembayaran" : "Infaq Pendaftaran"}
        </h3>
        <p className="text-sm text-muted-foreground">Ikuti langkah di bawah untuk mendaftar</p>
      </div>
      
      {qrisMethods && qrisMethods.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">1</span>
            Scan Salah Satu QRIS
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {qrisMethods.map((qris: any) => (
              <div key={qris.id} className="rounded-xl border border-border/60 bg-muted/30 p-4 flex flex-col items-center">
                <div className="text-center mb-3">
                  <p className="font-bold text-sm">{qris.name}</p>
                  {qris.description && (
                    <p className="text-[11px] text-muted-foreground">{qris.description}</p>
                  )}
                </div>
                {qris.qr_url && (
                  <div className="bg-white p-3 rounded-xl shadow-inner mb-2">
                    <img src={qris.qr_url} alt={qris.name} className="max-w-[200px] h-auto" />
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground italic">Tekan lama gambar untuk simpan/bagikan</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 p-4 text-center border border-amber-200">
          <Info className="h-5 w-5 text-amber-600 mx-auto mb-2" />
          <p className="text-xs text-amber-800">Metode pembayaran QRIS belum tersedia. Silakan hubungi admin.</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">2</span>
          Nominal Transfer
        </div>
        
        <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
          {event.registration_type === "paid" ? (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Bayar</p>
              <p className="text-2xl font-bold text-primary">Rp {event.price.toLocaleString("id-ID")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-center text-muted-foreground">Pilih nominal infaq terbaikmu</p>
              <div className="grid grid-cols-2 gap-2">
                {[5000, 10000, 20000, 50000].map((nominal) => (
                  <Button
                    key={nominal}
                    type="button"
                    variant={paymentForm.amount === nominal ? "default" : "outline"}
                    className={`text-sm h-11 font-bold ${paymentForm.amount === nominal ? "bg-primary shadow-md" : ""}`}
                    onClick={() => setPaymentForm({ ...paymentForm, amount: nominal })}
                  >
                    Rp {nominal.toLocaleString("id-ID")}
                  </Button>
                ))}
              </div>
              <div className="pt-2">
                <Label className="text-[10px] text-muted-foreground mb-1 block">Atau masukkan nominal lain</Label>
                <Input
                  type="number"
                  placeholder="Contoh: 15000"
                  className="h-10 text-sm font-bold"
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">3</span>
          Upload Bukti Bayar
        </div>
        
        <div className="relative">
          <input
            id="proof-upload"
            type="file"
            accept="image/*"
            onChange={(e) => setPaymentForm({ ...paymentForm, proofFile: e.target.files?.[0] || null })}
            className="hidden"
          />
          <label 
            htmlFor="proof-upload"
            className={`flex flex-col items-center justify-center w-full min-h-[100px] rounded-xl border-2 border-dashed transition-all cursor-pointer ${
              paymentForm.proofFile ? "border-green-500 bg-green-50/30" : "border-border/60 hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            {paymentForm.proofFile ? (
              <div className="flex flex-col items-center p-4">
                <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm font-bold text-green-700 truncate max-w-[200px]">{paymentForm.proofFile.name}</p>
                <p className="text-[10px] text-green-600/70">Klik untuk ganti file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center p-4">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Klik untuk upload bukti</p>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">Format JPG/PNG, Maks 5MB</p>
              </div>
            )}
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-4">
        <Button
          onClick={onSubmit}
          disabled={submitting || !paymentForm.proofFile || paymentForm.amount <= 0}
          className="w-full bg-primary text-primary-foreground py-6 text-lg font-bold shadow-lg shadow-primary/20"
        >
          {submitting ? "Sedang Mengirim…" : "Konfirmasi & Daftar"}
        </Button>
        <Button
          onClick={onCancel}
          variant="ghost"
          className="w-full text-muted-foreground"
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
