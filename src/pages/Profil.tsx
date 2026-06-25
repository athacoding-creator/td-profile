import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Shield,
  Download,
  Sun,
  Moon,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Link } from "react-router-dom";
import { formatPhoneDisplay } from "@/lib/phone";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const OCCUPATIONS = [
  "Pelajar",
  "Mahasiswa",
  "Karyawan Swasta",
  "PNS / ASN",
  "Wiraswasta",
  "Guru / Dosen",
  "Profesional (Dokter, Pengacara, dll)",
  "Ibu Rumah Tangga",
  "Belum Bekerja",
  "Lainnya",
];

type Wilayah = { id: string; name: string; province_id?: string; regency_id?: string };

type View = "menu" | "edit" | "password";

function ProfilContent() {
  const { user, profile, refreshProfile, signOut, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const [view, setView] = useState<View>("menu");
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [pw, setPw] = useState({ newPw: "", confirmPw: "" });
  const [pwLoading, setPwLoading] = useState(false);
  
  const [provinces, setProvinces] = useState<Wilayah[]>([]);
  const [regencies, setRegencies] = useState<Wilayah[]>([]);
  const [districts, setDistricts] = useState<Wilayah[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  // Lazy load regional data when entering edit mode
  useEffect(() => {
    if (view === "edit" && provinces.length === 0) {
      loadRegionalData();
    }
  }, [view]);

  const loadRegionalData = async () => {
    setIsDataLoading(true);
    setDataError(null);
    try {
      // Import JSON dynamically to reduce initial bundle size
      const [pData, rData, dData] = await Promise.all([
        import("@/data/provinces.json").then(m => m.default),
        import("@/data/regencies.json").then(m => m.default),
        import("@/data/districts.json").then(m => m.default)
      ]);

      if (Array.isArray(pData)) setProvinces(pData as Wilayah[]);
      if (Array.isArray(rData)) setRegencies(rData as Wilayah[]);
      if (Array.isArray(dData)) setDistricts(dData as Wilayah[]);
      
    } catch (e) {
      console.error("Error loading regional data:", e);
      setDataError("Gagal memuat data wilayah. Anda tetap bisa mengisi profil secara manual.");
      toast.error("Gagal memuat data wilayah");
    } finally {
      setIsDataLoading(false);
    }
  };

  // Cascade: load regencies when province changes
  const filteredRegencies = useMemo(() => {
    if (!form?.province_code || regencies.length === 0) return [];
    return regencies.filter((r) => String(r.province_id) === String(form.province_code));
  }, [form?.province_code, regencies]);

  // Cascade: load districts when regency changes
  const filteredDistricts = useMemo(() => {
    if (!form?.regency_code || districts.length === 0) return [];
    return districts.filter((d) => String(d.regency_id) === String(form.regency_code));
  }, [form?.regency_code, districts]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          gender: form.gender,
          birth_date: form.birth_date || null,
          address: form.address,
          province_code: form.province_code || null,
          province_name: form.province_name || null,
          regency_code: form.regency_code || null,
          regency_name: form.regency_name || null,
          district_code: form.district_code || null,
          district_name: form.district_name || null,
          city: form.regency_name || form.city || null,
          occupation: form.occupation || null,
          instansi: form.instansi || null,
          hobi: form.hobi || null,
        })
        .eq("id", user.id);
      setLoading(false);
      if (error) return toast.error(error.message);
      const wasComplete = profile?.is_complete;
      await refreshProfile();
      const { data: fresh } = await supabase
        .from("profiles")
        .select("is_complete")
        .eq("id", user.id)
        .maybeSingle();
      if (!wasComplete && fresh?.is_complete) {
        toast.success("Profil lengkap! Bonus poin diberikan 🎉");
      } else {
        toast.success("Tersimpan");
      }
      setView("menu");
    } catch (e) {
      console.error("Error saving profile:", e);
      toast.error("Terjadi kesalahan saat menyimpan profil");
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!user) return;
    if (pw.newPw.length < 6) return toast.error("Password baru minimal 6 karakter");
    if (pw.newPw !== pw.confirmPw) return toast.error("Konfirmasi password tidak cocok");
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.newPw });
      if (error) return toast.error(error.message);
      toast.success("Password berhasil diubah");
      setPw({ newPw: "", confirmPw: "" });
      setView("menu");
    } catch (e) {
      console.error("Error changing password:", e);
      toast.error("Terjadi kesalahan saat mengubah password");
    } finally {
      setPwLoading(false);
    }
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
      badge: "Segera hadir",
      onClick: () =>
        toast.info("Fitur QR Kehadiran masih dalam pengembangan."),
    },
    { icon: Ticket, label: "Event saya", to: "/riwayat" },
    { icon: HeartHandshake, label: "Donasi", href: "https://sedekah.terasdakwah.com" },
    { icon: Award, label: "Poin", to: "/poin" },
    { icon: Download, label: "Download Aplikasi", to: "/profil/download" },
    ...(isAdmin ? [{ icon: Shield, label: "Admin", to: "/admin" }] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container max-w-2xl py-8 min-h-screen">
        {view === "menu" ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-10 w-10 rounded-full border-accent/20 bg-background text-foreground shadow-sm hover:bg-accent/5"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-accent" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>

            <h2 className="mt-8 flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <span className="h-4 w-1.5 rounded-sm bg-accent" />
              Data pribadi
            </h2>

            <ul className="mt-3 divide-y divide-border/70 border-y border-border/70">
              {menu.map(({ icon: Icon, label, to, href, onClick, badge }: any) => {
                const inner = (
                  <>
                    <span className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-foreground">{label}</span>
                      {badge && (
                        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {badge}
                        </span>
                      )}
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
          /* ── Edit data akun ─────────────────────────────────────────── */
          <>
            <button
              type="button"
              onClick={() => setView("menu")}
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Kembali
            </button>
            <h1 className="font-display text-2xl font-bold">Ubah data akun</h1>
            
            {dataError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-500">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{dataError}</p>
              </div>
            )}

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
                <Label>Tanggal lahir</Label>
                <Input type="date" value={form.birth_date ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
              </div>

              {/* Domisili */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Provinsi</Label>
                  {isDataLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                {provinces.length > 0 ? (
                  <Select
                    value={form.province_code ?? ""}
                    onValueChange={(v) => {
                      if (!v) return;
                      const p = provinces.find((x) => String(x.id) === String(v));
                      setForm({ 
                        ...form, 
                        province_code: v, 
                        province_name: p?.name ?? null,
                        regency_code: null, 
                        regency_name: null, 
                        district_code: null, 
                        district_name: null 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih provinsi" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {provinces.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input 
                    placeholder={isDataLoading ? "Memuat data..." : "Ketik nama provinsi"} 
                    value={form.province_name ?? ""} 
                    onChange={(e) => setForm({ ...form, province_name: e.target.value, province_code: null })} 
                    disabled={isDataLoading}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Kabupaten / Kota</Label>
                {regencies.length > 0 ? (
                  <Select
                    value={form.regency_code ?? ""}
                    onValueChange={(v) => {
                      if (!v) return;
                      const r = filteredRegencies.find((x) => String(x.id) === String(v));
                      setForm({ 
                        ...form, 
                        regency_code: v, 
                        regency_name: r?.name ?? null,
                        district_code: null, 
                        district_name: null 
                      });
                    }}
                    disabled={!form.province_code && provinces.length > 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        form.province_code || provinces.length === 0 ? "Pilih kabupaten/kota" : "Pilih provinsi dulu"
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {filteredRegencies.length > 0 ? (
                        filteredRegencies.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)
                      ) : (
                        <div className="p-2 text-center text-xs text-muted-foreground">
                          {form.province_code ? "Data tidak tersedia" : "Pilih provinsi terlebih dahulu"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input 
                    placeholder={isDataLoading ? "Memuat data..." : "Ketik nama kabupaten/kota"} 
                    value={form.regency_name ?? ""} 
                    onChange={(e) => setForm({ ...form, regency_name: e.target.value, regency_code: null })} 
                    disabled={isDataLoading}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Kecamatan</Label>
                {districts.length > 0 ? (
                  <Select
                    value={form.district_code ?? ""}
                    onValueChange={(v) => {
                      if (!v) return;
                      const d = filteredDistricts.find((x) => String(x.id) === String(v));
                      setForm({ ...form, district_code: v, district_name: d?.name ?? null });
                    }}
                    disabled={!form.regency_code && regencies.length > 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        form.regency_code || regencies.length === 0 ? "Pilih kecamatan" : "Pilih kabupaten/kota dulu"
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {filteredDistricts.length > 0 ? (
                        filteredDistricts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)
                      ) : (
                        <div className="p-2 text-center text-xs text-muted-foreground">
                          {form.regency_code ? "Data tidak tersedia" : "Pilih kabupaten/kota terlebih dahulu"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input 
                    placeholder={isDataLoading ? "Memuat data..." : "Ketik nama kecamatan"} 
                    value={form.district_name ?? ""} 
                    onChange={(e) => setForm({ ...form, district_name: e.target.value, district_code: null })} 
                    disabled={isDataLoading}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Alamat lengkap</Label>
                <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={250} />
              </div>

              <div className="space-y-1.5">
                <Label>Pekerjaan</Label>
                <Select value={form.occupation ?? ""} onValueChange={(v) => setForm({ ...form, occupation: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pekerjaan" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {OCCUPATIONS.map((occ) => (
                      <SelectItem key={occ} value={occ}>
                        {occ}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Instansi / Perusahaan</Label>
                <Input value={form.instansi ?? ""} onChange={(e) => setForm({ ...form, instansi: e.target.value })} maxLength={100} />
              </div>

              <div className="space-y-1.5">
                <Label>Hobi</Label>
                <Input value={form.hobi ?? ""} onChange={(e) => setForm({ ...form, hobi: e.target.value })} maxLength={100} />
              </div>

              <Button onClick={save} disabled={loading} className="w-full bg-primary text-primary-foreground">
                {loading ? "Menyimpan…" : "Simpan data"}
              </Button>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

export default function Profil() {
  return (
    <ErrorBoundary>
      <ProfilContent />
    </ErrorBoundary>
  );
}
