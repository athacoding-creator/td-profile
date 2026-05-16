import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronLeft,
  User as UserIcon,
  Ticket,
  HeartHandshake,
  Award,
  XCircle,
  QrCode,
  KeyRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatPhoneDisplay } from "@/lib/phone";

type View = "menu" | "edit" | "qr" | "password";

export default function Profil() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [view, setView] = useState<View>("menu");
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [pw, setPw] = useState({ oldPw: "", newPw: "", confirmPw: "" });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  useEffect(() => {
    if (view === "qr" && user && !qrUrl) {
      QRCode.toDataURL(user.id, { width: 320, margin: 2 }).then(setQrUrl);
    }
  }, [view, user, qrUrl]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const wasComplete = profile?.is_complete;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        gender: form.gender,
        city: form.city,
        birth_date: form.birth_date || null,
        address: form.address,
      })
      .eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    if (!wasComplete) toast.success("Profil lengkap! Bonus poin diberikan 🎉");
    else toast.success("Tersimpan");
    setView("menu");
  };

  const changePassword = async () => {
    if (!user || !profile) return;
    if (pw.newPw.length < 6) return toast.error("Password baru minimal 6 karakter");
    if (pw.newPw !== pw.confirmPw) return toast.error("Konfirmasi password tidak cocok");
    setPwLoading(true);
    // Re-verify old password by attempting sign-in
    const synthEmail = `${profile.phone}@wa.tdprofile.local`;
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: synthEmail,
      password: pw.oldPw,
    });
    if (verifyErr) {
      setPwLoading(false);
      return toast.error("Password lama salah");
    }
    const { error } = await supabase.auth.updateUser({ password: pw.newPw });
    setPwLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password berhasil diubah");
    setPw({ oldPw: "", newPw: "", confirmPw: "" });
    setView("menu");
  };

  const initial = (profile?.full_name || profile?.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  const menu = [
    { icon: UserIcon, label: "Ubah data akun", onClick: () => setView("edit") },
    { icon: KeyRound, label: "Ubah password", onClick: () => setView("password") },
    {
      icon: QrCode,
      label: "QR Kehadiran saya",
      onClick: () =>
        toast.info("Fitur masih dalam pembuatan. Tunggu pemberitahuan berikutnya ya!"),
    },
    { icon: Ticket, label: "Event saya", to: "/riwayat" },
    { icon: HeartHandshake, label: "Donasi", href: "https://sedekah.terasdakwah.com" },
    { icon: Award, label: "Poin", to: "/poin" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container max-w-2xl py-8">
        {view === "menu" ? (
          <>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold text-foreground">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-bold text-foreground">
                  {profile?.full_name || "Pengguna"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {profile?.phone ? formatPhoneDisplay(profile.phone) : ""}
                </p>
              </div>
            </div>

            <h2 className="mt-8 flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <span className="h-4 w-1.5 rounded-sm bg-accent" />
              Data pribadi
            </h2>

            <ul className="mt-3 divide-y divide-border/70 border-y border-border/70">
              {menu.map(({ icon: Icon, label, to, href, onClick }: any) => {
                const inner = (
                  <>
                    <span className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-foreground">{label}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </>
                );
                return (
                  <li key={label}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between py-4 transition hover:opacity-80"
                      >
                        {inner}
                      </a>
                    ) : to ? (
                      <Link to={to} className="flex items-center justify-between py-4 transition hover:opacity-80">
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={onClick}
                        className="flex w-full items-center justify-between py-4 text-left transition hover:opacity-80"
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center justify-between py-4 text-left text-destructive transition hover:opacity-80"
                >
                  <span className="flex items-center gap-3">
                    <XCircle className="h-5 w-5" />
                    Keluar akun
                  </span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </li>
            </ul>

            <p className="mt-10 text-center text-xs text-muted-foreground">
              Copyright © 2014 Teras Dakwah, All rights reserved
            </p>
          </>
        ) : view === "qr" ? (
          <>
            <button
              type="button"
              onClick={() => setView("menu")}
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Kembali
            </button>
            <h1 className="font-display text-2xl font-bold">QR Kehadiran Saya</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tunjukkan QR ini ke admin saat tiba di lokasi event untuk mendapatkan poin kehadiran.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
              {qrUrl ? <img src={qrUrl} alt="QR kehadiran" className="rounded-lg" /> : <p className="text-sm text-muted-foreground">Memuat QR…</p>}
              <p className="text-xs text-muted-foreground">{profile?.full_name || ""}</p>
            </div>
          </>
        ) : view === "password" ? (
          <>
            <button
              type="button"
              onClick={() => setView("menu")}
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Kembali
            </button>
            <h1 className="font-display text-2xl font-bold">Ubah password</h1>
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Password lama</Label>
                <Input type="password" value={pw.oldPw} onChange={(e) => setPw({ ...pw, oldPw: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Password baru</Label>
                <Input type="password" value={pw.newPw} onChange={(e) => setPw({ ...pw, newPw: e.target.value })} minLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label>Konfirmasi password baru</Label>
                <Input type="password" value={pw.confirmPw} onChange={(e) => setPw({ ...pw, confirmPw: e.target.value })} minLength={6} />
              </div>
              <Button onClick={changePassword} disabled={pwLoading} className="w-full bg-primary text-primary-foreground">
                {pwLoading ? "Menyimpan…" : "Simpan password"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setView("menu")}
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Kembali
            </button>
            <h1 className="font-display text-2xl font-bold">Ubah data akun</h1>
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Nama lengkap</Label>
                <Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>No. WhatsApp</Label>
                <Input value={formatPhoneDisplay(form.phone ?? "")} readOnly disabled />
                <p className="text-xs text-muted-foreground">Nomor WhatsApp tidak dapat diubah karena digunakan sebagai identitas akun.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <div className="flex gap-2">
                  {(["L", "P"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, gender: g })}
                      className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium ${
                        form.gender === g ? "border-accent bg-accent/5" : "border-border"
                      }`}
                    >
                      {g === "L" ? "Laki-laki" : "Perempuan"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Kota</Label>
                <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal lahir</Label>
                <Input type="date" value={form.birth_date ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Alamat</Label>
                <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={250} />
              </div>
              <Button onClick={save} disabled={loading} className="w-full bg-primary text-primary-foreground">
                {loading ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
