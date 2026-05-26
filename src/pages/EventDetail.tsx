import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { MapPin, Calendar, Users, Lock, Link2, ChevronLeft, Upload } from "lucide-react";
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
  const [qrisUrl, setQrisUrl] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("events")
        .select("id,title,description,venue,city,starts_at,ends_at,status,gender,event_type,poster_url,group_link,points_reward,program_id,created_at,is_pinned,is_recurring,recurring_days,recurring_start_time,recurring_end_time,recurring_until,registration_type,price,min_infaq,max_infaq")
        .eq("id", id).maybeSingle();
      setEvent(data);
      
      // Load QRIS
      const { data: qrisData } = await supabase.from("donation_settings").select("value").eq("key", "qris_url").maybeSingle();
      if (qrisData?.value) setQrisUrl(qrisData.value);
      
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
      setPaymentForm({ amount: event.registration_type === "paid" ? event.price : event.min_infaq, proofFile: null });
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

        <div className="mt-8 space-y-3">
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
              <div className="rounded-xl bg-accent/10 p-4 text-center font-semibold text-accent">
                ✓ Kamu sudah terdaftar
                {registration.payment_status === "pending" && " (Menunggu verifikasi pembayaran)"}
                {registration.payment_status === "approved" && " (Pembayaran disetujui)"}
                {registration.payment_status === "rejected" && " (Pembayaran ditolak)"}
              </div>
              {registration.payment_status === "rejected" && (
                <Button
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Kirim Ulang Bukti Pembayaran
                </Button>
              )}
              {registration.payment_status === "approved" && (
                <>
                  {scanNotYetAvailable ? (
                    <div className="rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-800 border border-amber-200">
                      {sw.message ?? `Scan QR tersedia mulai jam ${scanStartTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
                    </div>
                  ) : scanAvailable ? (
                    <Link to={`/event/${event.id}/scan`}>
                      <Button className="w-full bg-primary text-primary-foreground">Scan QR Absensi</Button>
                    </Link>
                  ) : (
                    <div className="rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">
                      {sw.message ?? "Scan QR sedang tidak tersedia"}
                    </div>
                  )}
                </>
              )}
              {event.group_link && (
                <a href={event.group_link} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full">
                    <Link2 className="mr-2 h-4 w-4" /> Gabung Grup
                  </Button>
                </a>
              )}
            </>
          ) : showPaymentForm ? (
            <PaymentForm
              event={event}
              qrisUrl={qrisUrl}
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
              className="w-full bg-primary text-primary-foreground"
            >
              {submitting ? "Mendaftarkan…" : user ? "Daftar Event" : "Login untuk Daftar"}
            </Button>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function PaymentForm({ event, qrisUrl, paymentForm, setPaymentForm, submitting, onSubmit, onCancel }: any) {
  return (
    <div className="rounded-xl border border-border/60 p-4 space-y-4">
      <h3 className="font-semibold">
        {event.registration_type === "paid" ? "Pembayaran Event" : "Infaq Event"}
      </h3>
      
      {qrisUrl && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">QRIS Pembayaran</p>
          <img src={qrisUrl} alt="QRIS" className="max-w-xs rounded-lg" />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium">
          Nominal {event.registration_type === "paid" ? "Pembayaran" : "Infaq"} (Rp)
        </label>
        <Input
          type="number"
          value={paymentForm.amount}
          onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
          min={event.registration_type === "paid" ? event.price : event.min_infaq}
          max={event.registration_type === "paid" ? event.price : event.max_infaq}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          {event.registration_type === "paid"
            ? `Nominal: Rp ${event.price.toLocaleString("id-ID")}`
            : `Range: Rp ${event.min_infaq.toLocaleString("id-ID")} - Rp ${event.max_infaq.toLocaleString("id-ID")}`
          }
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium">Upload Bukti Pembayaran</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPaymentForm({ ...paymentForm, proofFile: e.target.files?.[0] || null })}
          className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
        {paymentForm.proofFile && (
          <p className="text-xs text-accent font-medium">✓ {paymentForm.proofFile.name}</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 bg-primary text-primary-foreground"
        >
          <Upload className="h-4 w-4 mr-2" /> {submitting ? "Mengirim…" : "Kirim Bukti"}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1"
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
