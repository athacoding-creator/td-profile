import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { normalizePhone, isValidPhone } from "@/lib/phone";

export default function ForgotPassword() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      toast.error("Nomor WhatsApp tidak valid");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("reset-password-wa", {
        body: { phone: normalized },
      });
      if (error) throw error;
      setDone(true);
      toast.success("Permintaan diproses");
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses permintaan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-md py-12">
        <h1 className="font-display text-3xl font-bold text-foreground">Lupa password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Masukkan nomor WhatsApp akun Anda. Jika nomor terdaftar, password baru akan dikirim via WhatsApp.
        </p>
        {done ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
              Fitur ini dalam masalah. Mohon maaf atas ketidaknyamanannya. Silakan hubungi admin untuk reset password.
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
              {loading ? "Memproses…" : "Kirim password baru"}
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
