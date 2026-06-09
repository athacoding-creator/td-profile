import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { normalizePhone, isValidPhone, phoneToEmail } from "@/lib/phone";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const cn = (...classes: string[]) => {
  return classes.filter(Boolean).join(" ");
};

// Animated background with decorative elements
const BackgroundPattern = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-accent/10" />
      
      {/* Decorative circles */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-10 right-10 w-32 h-32 rounded-full bg-accent/10 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-20 left-5 w-40 h-40 rounded-full bg-primary/5 blur-3xl"
      />
    </div>
  );
};

// Animated accent bar
const AccentBar = () => {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="h-1 w-12 rounded-full bg-accent origin-left"
    />
  );
};

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
      <main className="container max-w-md py-8 flex flex-col justify-center min-h-[calc(100vh-80px)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Background pattern */}
          <div className="absolute -inset-6 rounded-3xl overflow-hidden -z-10">
            <BackgroundPattern />
          </div>

          {/* Main card */}
          <div className="relative rounded-3xl border border-accent/30 bg-gradient-to-b from-accent/10 to-background p-8 shadow-lg"
               style={{ boxShadow: "var(--shadow-card)" }}>
            
            {/* Header section */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-accent" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {mode === "signin" ? "Selamat Datang" : "Bergabunglah"}
                </h1>
              </div>
              <AccentBar />
              <p className="mt-4 text-sm text-muted-foreground">
                {mode === "signin" 
                  ? "Masuk untuk mengikuti pengajian dan acara Teras Dakwah" 
                  : "Daftar untuk mendapatkan akses ke semua fitur Teras Dakwah"}
              </p>
            </motion.div>

            {/* Form section */}
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onSubmit={submit}
              className="space-y-5"
            >
              <AnimatePresence mode="wait">
                {mode === "signup" && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    <Label className="text-sm font-medium text-foreground">
                      Nama Lengkap <span className="text-accent">*</span>
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={100}
                      placeholder="Masukkan nama lengkap Anda"
                      className="bg-card/50 border-accent/20 placeholder:text-muted-foreground text-foreground focus:border-accent focus:ring-accent/50"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  No. WhatsApp <span className="text-accent">*</span>
                </Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  maxLength={20}
                  className="bg-card/50 border-accent/20 placeholder:text-muted-foreground text-foreground focus:border-accent focus:ring-accent/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Password <span className="text-accent">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={isPasswordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    className="bg-card/50 border-accent/20 placeholder:text-muted-foreground text-foreground pr-10 focus:border-accent focus:ring-accent/50"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isPasswordVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {mode === "signin" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="text-right"
                >
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-accent transition-colors"
                  >
                    Lupa password?
                  </Link>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium py-2.5 rounded-lg transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                      Memproses…
                    </span>
                  ) : mode === "signin" ? (
                    "Masuk"
                  ) : (
                    "Daftar"
                  )}
                </Button>
              </motion.div>
            </motion.form>

            {/* Mode toggle */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setName("");
                setPhone("");
                setPassword("");
              }}
              className="mt-6 w-full text-sm text-muted-foreground hover:text-accent transition-colors py-2"
            >
              {mode === "signin" ? "Belum punya akun? " : "Sudah punya akun? "}
              <span className="font-semibold text-accent">
                {mode === "signin" ? "Daftar sekarang" : "Masuk di sini"}
              </span>
            </motion.button>

            {/* Back to home */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-4 text-center"
            >
              <Link
                to="/"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                ← Kembali ke beranda
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
