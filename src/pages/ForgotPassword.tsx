import { useState } from "react";
import { Link } from "react-router-dom";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { normalizePhone, isValidPhone } from "@/lib/phone";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const ADMIN_WA = "6285111514040";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      toast.error("Nomor WhatsApp tidak valid");
      return;
    }
    setLoading(true);

    // Buka tab baru SEKARANG (masih dalam gestur klik user) supaya tidak
    // diblokir popup blocker; alamatnya diisi setelah password selesai dibuat.
    const waTab = window.open("", "_blank");
    const message =
      `Assalamu'alaikum Admin Teras Dakwah,\n\n` +
      `Saya ingin konfirmasi reset password akun saya.\n` +
      `No. WhatsApp terdaftar: +${normalized}\n\n` +
      `Mohon bantuannya, terima kasih.`;
    const waUrl = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(message)}`;

    try {
      // Buat password baru di server & catat ke dashboard admin
      const { error } = await supabase.functions.invoke("reset-password-wa", {
        body: { phone: normalized },
      });
      if (error) console.error("reset-password-wa error:", error);
    } catch (err) {
      console.error("reset-password-wa invoke failed:", err);
    }

    if (waTab) {
      waTab.location.href = waUrl;
    } else {
      // Popup tetap terblokir: arahkan tab ini langsung
      window.location.href = waUrl;
    }
    setDone(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-md py-12">
        <h1 className="font-display text-3xl font-bold text-foreground">Lupa password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Masukkan nomor WhatsApp Anda, lalu tekan Konfirmasi — password baru akan dibuat dan Anda akan diarahkan ke WhatsApp admin.
        </p>
        {done ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
              Anda diarahkan ke WhatsApp admin. Jika tidak terbuka otomatis,{" "}
              <a
                href={`https://wa.me/${ADMIN_WA}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary underline"
              >
                klik di sini
              </a>
              .
            </div>
            <Link to="/auth" className="block text-center text-sm text-muted-foreground hover:underline">
              ← Kembali ke Masuk
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label>No. WhatsApp</Label>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="081234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={20}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">
              {loading ? "Memproses…" : "Konfirmasi"}
            </Button>
            <Link to="/auth" className="block text-center text-sm text-muted-foreground hover:underline">
              ← Kembali ke Masuk
            </Link>
          </form>
        )}
      </main>
    </div>
  );
}
