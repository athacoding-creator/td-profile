import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ChevronLeft,
  Download,
  Smartphone,
  Apple,
  Monitor,
  CheckCircle2,
  Share,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function DownloadApp() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Sudah jalan sebagai PWA?
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;
    if (standalone) setInstalled(true);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("Aplikasi berhasil diinstall 🎉");
    };
    window.addEventListener("beforeinstallprompt", onBIP as any);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP as any);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) {
      toast.info(
        "Browsermu belum siap install otomatis. Ikuti panduan di bawah ya.",
      );
      return;
    }
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        toast.success("Install dimulai…");
      }
      setDeferred(null);
    } catch {
      toast.error("Gagal memulai install. Coba ikuti panduan manual.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container max-w-2xl py-6">
        <Link
          to="/profil"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali ke profil
        </Link>

        <div className="rounded-3xl border border-accent/30 bg-gradient-to-b from-accent/10 to-background p-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15">
            <Download className="h-8 w-8 text-accent" />
          </div>
          <h1 className="font-display text-2xl font-bold">Download Aplikasi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pasang Teras Dakwah di HP atau laptopmu biar lebih cepat dibuka,
            seperti aplikasi biasa. Tidak perlu lewat Play Store atau App Store.
          </p>

          {installed ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Sudah terpasang
            </div>
          ) : (
            <Button
              onClick={handleInstall}
              className="mt-5 w-full bg-primary text-primary-foreground"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              {deferred ? "Install Sekarang" : "Lihat Cara Install"}
            </Button>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Aplikasi tetap update otomatis tanpa harus download ulang.
          </p>
        </div>

        <h2 className="mt-8 flex items-center gap-2 font-display text-lg font-bold">
          <span className="h-4 w-1.5 rounded-sm bg-accent" />
          Panduan install
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih sesuai perangkat yang kamu pakai.
        </p>

        <Accordion type="single" collapsible className="mt-4">
          {/* Android */}
          <AccordionItem value="android">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-left">
                <Smartphone className="h-5 w-5 text-primary" />
                <span>
                  <span className="block font-semibold">Android</span>
                  <span className="block text-xs text-muted-foreground">
                    HP Samsung, Xiaomi, Oppo, dll
                  </span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal space-y-3 pl-5 text-sm">
                <li>
                  Buka website Teras Dakwah pakai{" "}
                  <strong>Google Chrome</strong>.
                </li>
                <li>
                  Ketuk ikon <strong>titik tiga</strong>{" "}
                  <MoreVertical className="inline h-4 w-4 align-text-bottom" />{" "}
                  di pojok kanan atas.
                </li>
                <li>
                  Pilih <strong>“Tambahkan ke layar Utama”</strong> atau{" "}
                  <strong>“Install aplikasi”</strong>.
                </li>
                <li>
                  Ketuk <strong>“Install” / “Tambah”</strong> pada konfirmasi.
                </li>
                <li>
                  Selesai! Buka aplikasi Teras Dakwah dari layar utama HP-mu.
                </li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          {/* iOS */}
          <AccordionItem value="ios">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-left">
                <Apple className="h-5 w-5 text-primary" />
                <span>
                  <span className="block font-semibold">iPhone / iPad</span>
                  <span className="block text-xs text-muted-foreground">
                    Pakai Safari, bukan Chrome
                  </span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal space-y-3 pl-5 text-sm">
                <li>
                  Buka website Teras Dakwah pakai aplikasi{" "}
                  <strong>Safari</strong> (warna biru).
                </li>
                <li>
                  Ketuk ikon <strong>Bagikan</strong>{" "}
                  <Share className="inline h-4 w-4 align-text-bottom" /> di
                  bagian bawah layar.
                </li>
                <li>
                  Gulir ke bawah, pilih{" "}
                  <strong>“Tambahkan ke Layar Utama”</strong>.
                </li>
                <li>
                  Ketuk <strong>“Tambah”</strong> di pojok kanan atas.
                </li>
                <li>
                  Selesai! Ikon Teras Dakwah muncul di home screen iPhone-mu.
                </li>
              </ol>
              <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Catatan: di iPhone, tombol install otomatis belum didukung.
                Wajib lewat Safari ya.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Windows / Laptop */}
          <AccordionItem value="windows">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-3 text-left">
                <Monitor className="h-5 w-5 text-primary" />
                <span>
                  <span className="block font-semibold">Windows / Laptop</span>
                  <span className="block text-xs text-muted-foreground">
                    Chrome atau Microsoft Edge
                  </span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal space-y-3 pl-5 text-sm">
                <li>
                  Buka website Teras Dakwah pakai{" "}
                  <strong>Chrome</strong> atau <strong>Microsoft Edge</strong>.
                </li>
                <li>
                  Lihat di kanan kolom alamat (URL), ada ikon{" "}
                  <strong>install</strong> (gambar layar dengan panah).
                </li>
                <li>
                  Klik ikon itu, lalu pilih <strong>“Install”</strong>.
                </li>
                <li>
                  Atau klik tombol <strong>“Install Sekarang”</strong> di atas
                  halaman ini.
                </li>
                <li>
                  Aplikasi muncul di desktop dan menu Start, tinggal klik buat
                  buka.
                </li>
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
          <p className="font-semibold">Butuh bantuan?</p>
          <p className="mt-1 text-muted-foreground">
            Kalau bingung, hubungi admin Teras Dakwah lewat WhatsApp di{" "}
            <a
              href="https://wa.me/6285111514040"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary underline"
            >
              0851-1151-4040
            </a>
            . Insya Allah dibantu sampai bisa.
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}