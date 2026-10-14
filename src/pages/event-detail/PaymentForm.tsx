import {useState} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {Upload, ChevronDown, ChevronUp, Info, MessageCircle, CreditCard, Landmark, Wallet} from "lucide-react";
import { toast } from "sonner";

export function PaymentForm({ event, paymentMethod, paymentForm, setPaymentForm, submitting, onSubmit, onCancel }: any) {
  const isPaid = event.registration_type === "paid";
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const whatsappNumber = event.registration_type === "paid" ? "+6282136031995" : "+6285171577665";
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

