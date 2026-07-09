import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, Copy, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import QRCode from "qrcode";

export default function AttendanceQR() {
  const { user, profile } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generateQR = async () => {
      if (!user?.id) return;
      try {
        // Generate QR code with user ID
        const qrUrl = await QRCode.toDataURL(user.id, {
          errorCorrectionLevel: "H",
          type: "image/png",
          margin: 1,
          width: 300,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrDataUrl(qrUrl);
      } catch (error) {
        console.error("Error generating QR code:", error);
        toast.error("Gagal membuat QR code");
      } finally {
        setLoading(false);
      }
    };

    generateQR();
  }, [user?.id]);

  const downloadQR = async () => {
    if (!qrDataUrl) return;
    try {
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `QR-Kehadiran-${profile?.full_name || user?.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("QR code berhasil diunduh");
    } catch (error) {
      console.error("Error downloading QR code:", error);
      toast.error("Gagal mengunduh QR code");
    }
  };

  const copyToClipboard = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast.success("ID pengguna disalin");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast.error("Gagal menyalin ID");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container max-w-2xl py-8">
        <Link
          to="/profil"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold">QR Kehadiran Saya</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tunjukkan QR code ini kepada admin untuk mencatat kehadiran Anda di acara
            </p>
          </div>

          {/* QR Code Display */}
          <div className="flex justify-center rounded-lg border border-border bg-card p-8">
            {loading ? (
              <div className="flex h-80 w-80 items-center justify-center">
                <div className="text-center">
                  <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
                  <p className="text-sm text-muted-foreground">Membuat QR code...</p>
                </div>
              </div>
            ) : qrDataUrl ? (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={qrDataUrl}
                  alt="QR Kehadiran"
                  className="h-80 w-80 rounded-lg border-2 border-border bg-white p-2"
                />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    ID: {user?.id}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-destructive">Gagal membuat QR code</p>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-foreground">Informasi Pengguna</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nama:</span>
                <span className="font-medium text-foreground">{profile?.full_name || "Tidak diisi"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium text-foreground">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID Pengguna:</span>
                <span className="font-mono text-xs font-medium text-foreground">{user?.id}</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h3 className="mb-3 font-semibold text-foreground">Cara Menggunakan</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <span>Tunjukkan QR code ini kepada admin di acara</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <span>Admin akan memindai QR code menggunakan scanner</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                <span>Kehadiran Anda akan tercatat otomatis</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={downloadQR}
              disabled={loading || !qrDataUrl}
              className="w-full bg-primary text-primary-foreground"
            >
              <Download className="mr-2 h-4 w-4" />
              Unduh QR Code
            </Button>
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="w-full"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                  Disalin!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Salin ID Pengguna
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
