import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ChevronLeft, CreditCard, Landmark, Wallet, Info, MessageCircle, Upload, ChevronDown, ChevronUp } from "lucide-react";
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
  const [paymentForm, setPaymentForm] = useState({ amount: 0, proofFile: null as File | null });
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    (async () => {
      if (!id) return;
      
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (eventError || !eventData) {
        toast.error("Event tidak ditemukan");
        navigate("/");
        return;
      }
      setEvent(eventData);
      setPaymentForm(prev => ({ ...prev, amount: eventData.registration_type === "paid" ? eventData.price : eventData.min_infaq }));

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
        }
      }

      // Load payment method from QRIS Manager based on event category
      if (eventData.payment_method_id) {
        const { data: pmData } = await supabase
          .from("payment_methods")
          .select("*")
          .eq("id", eventData.payment_method_id)
          .maybeSingle();
        setPaymentMethod(pmData);
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
          }
        }
      }

      // Load settings for WA
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
        paid_at: new Date().toISOString()
      };

      if (registration) {
        const { error } = await supabase.from("registrations").update(updateData).eq("id", registration.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("registrations").insert({
          ...updateData,
          event_id: event.id,
          user_id: user?.id
        });
        if (error) throw error;
      }

      toast.success("Bukti pembayaran berhasil diunggah!");
      
      // Redirect to WhatsApp with verification message
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

  const paymentSteps = [
    { number: 1, title: `Simpan detail ${paymentMethod?.type === 'qris' ? 'QRIS' : 'pembayaran'}.`, description: "Screenshot atau simpan gambarnya." },
    { number: 2, title: "Buka aplikasi m-banking atau e-wallet.", description: "Pilih menu bayar atau transfer." },
    { number: 3, title: paymentMethod?.type === 'qris' ? 'Scan QR Code di atas.' : `Transfer ke ${paymentMethod?.bank_name} ${paymentMethod?.account_number}`, description: "Pastikan data sesuai." },
    { number: 4, title: "Masukkan nominal sesuai yang tertera.", description: "Konfirmasi pembayaran." },
    { number: 5, title: "Simpan bukti pembayaran.", description: "Screenshot hasil transaksi." },
    { number: 6, title: "Upload bukti di bawah & konfirmasi.", description: "Selesai!" }
  ];

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
          </div>

          <div className="space-y-4">
            {paymentMethod ? (
              <div className="flex flex-col items-center gap-4 rounded-xl bg-muted/30 p-4 border border-border/40">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                  {paymentMethod.type === 'qris' ? <CreditCard className="h-3 w-3" /> : <Landmark className="h-3 w-3" />}
                  {paymentMethod.name}
                </div>
                
                {paymentMethod.type === 'qris' && paymentMethod.qr_url && (
                  <div className="rounded-2xl border-4 border-white bg-white p-2 shadow-md">
                    <img src={paymentMethod.qr_url} alt="QRIS" className="w-48 h-48 sm:w-64 sm:h-64 object-contain" />
                  </div>
                )}

                {paymentMethod.type !== 'qris' && (
                  <div className="w-full text-center space-y-1">
                    <p className="text-lg font-bold text-primary">{paymentMethod.bank_name}</p>
                    <p className="text-2xl font-mono font-bold">{paymentMethod.account_number}</p>
                    <p className="text-sm font-medium">a/n {paymentMethod.account_name}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700 border border-amber-100">
                  <Info className="h-3 w-3" /> Scan/Bayar sekarang dengan aplikasi Anda.
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-destructive/10 p-4 text-center text-xs text-destructive">
                Metode pembayaran belum dikonfigurasi.
              </div>
            )}

            <div className="rounded-xl border border-border/40 overflow-hidden">
              <button onClick={() => setExpandedStep(expandedStep === 1 ? null : 1)} className="w-full flex items-center justify-between p-3 bg-muted/50">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-accent" />
                  <span className="text-sm font-bold">Instruksi Pembayaran</span>
                </div>
                {expandedStep === 1 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedStep === 1 && (
                <div className="p-4 space-y-4 border-t">
                  {paymentSteps.map((step) => (
                    <div key={step.number} className="flex gap-3">
                      <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">{step.number}</div>
                      <div>
                        <p className="text-xs font-medium">{step.title}</p>
                        <p className="text-[10px] text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Nominal (Rp)</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  disabled={event.registration_type === "paid"}
                  className="h-12 bg-muted/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Upload Bukti Pembayaran</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPaymentForm({ ...paymentForm, proofFile: e.target.files?.[0] || null })}
                  className="h-12 py-2"
                />
              </div>

              <div className="pt-2">
                <Button onClick={submitPayment} disabled={submitting || !paymentForm.proofFile} className="w-full h-12 font-bold bg-green-600 hover:bg-green-700">
                  {submitting ? "Mengirim..." : <><MessageCircle className="mr-2 h-4 w-4" /> Konfirmasi & Chat Admin</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
