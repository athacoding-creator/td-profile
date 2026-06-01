import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { normalizePhone, isValidPhone, phoneToEmail } from "@/lib/phone";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const consumeRedirect = (fallback: string) => {
    try {
      const url = sessionStorage.getItem("postLoginRedirect");
      if (url) {
        sessionStorage.removeItem("postLoginRedirect");
        return url;
      }
    } catch {}
    return fallback;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      toast.error("Nomor WhatsApp tidak valid. Contoh: 081234567890");
      return;
    }
    setLoading(true);
    try {
      const email = phoneToEmail(normalized);
      if (mode === "signup") {
        if (!name.trim()) {
          toast.error("Nama wajib diisi");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name.trim(), phone: normalized },
          },
        });
        if (error) {
          if (/already registered|already exists|duplicate/i.test(error.message)) {
            throw new Error("Nomor WhatsApp ini sudah terdaftar. Silakan masuk.");
          }
          throw error;
        }
        toast.success("Akun dibuat!");
        navigate(consumeRedirect("/onboarding"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/invalid login/i.test(error.message)) {
            throw new Error("Nomor WhatsApp atau password salah.");
          }
          throw error;
        }
        navigate(consumeRedirect("/"));
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-md py-12">
        <h1 className="font-display text-3xl font-bold text-foreground">
          {mode === "signin" ? "Masuk" : "Daftar"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? "Masuk untuk mendaftar event." : "Buat akun untuk mengikuti pengajian."}
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label>Nama lengkap</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
            </div>
          )}
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
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {mode === "signin" && (
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Lupa password?
              </Link>
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">
            {loading ? "Memproses…" : mode === "signin" ? "Masuk" : "Daftar"}
          </Button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
        <Link to="/" className="mt-4 block text-center text-xs text-muted-foreground hover:underline">
          ← Kembali ke beranda
        </Link>
      </main>
    </div>
  );
}
