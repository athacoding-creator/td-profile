import { Link } from "react-router-dom";
import { useAdmin } from "./AdminLayout";
import {
  CalendarDays, Sparkles, Users, Gift, ShoppingBag, Image as ImageIcon, Settings as SettingsIcon, Hand, UserCircle, ClipboardCheck, CreditCard, Camera, QrCode
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ActivityStatsCard from "./ActivityStatsCard";

const groups = [
  {
    title: "Konten",
    items: [
      { to: "/admin/event", icon: CalendarDays, title: "Event", desc: "Buat & kelola event, export peserta, QR absensi", tag: "Real-time" },
      { to: "/admin/program", icon: Sparkles, title: "Program", desc: "Kategori payung event (Ngaji Asyik, AMIDA, dll)" },
    ],
  },
  {
    title: "Peserta & Aktivitas",
    items: [
      { to: "/admin/pendaftar", icon: Users, title: "Pendaftar", desc: "Persiapan lokasi (jumlah daftar)" },
      { to: "/admin/kehadiran", icon: ClipboardCheck, title: "Kehadiran", desc: "Data scan QR & Export Excel", tag: "Excel" },
      { to: "/admin/scan", icon: Camera, title: "Scan QR", desc: "Scan QR untuk absensi event" },
      { to: "/admin/akun", icon: UserCircle, title: "Akun", desc: "Lihat data lengkap tiap akun jamaah" },
    ],
  },
  {
    title: "Reward & Pengaturan",
    items: [
      { to: "/admin/merchandise", icon: ShoppingBag, title: "Merchandise", desc: "Kelola katalog reward & stok" },
      { to: "/admin/penukaran", icon: Gift, title: "Penukaran", desc: "Verifikasi & approve penukaran poin" },
      { to: "/admin/pembayaran", icon: CreditCard, title: "Pembayaran", desc: "Kelola data pembayaran" },
      { to: "/admin/qris", icon: QrCode, title: "QRIS Manager", desc: "Kelola kode QRIS untuk pembayaran" },
      { to: "/admin/pengaturan", icon: SettingsIcon, title: "Pengaturan", desc: "Bonus poin & pengaturan aplikasi" },
    ],
  },
];

export default function Dashboard() {
  const data = useAdmin();
  const { profile } = useAuth();
  const name = profile?.full_name?.split(" ")[0] || "Admin";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary to-primary/60 p-4 sm:p-6 md:p-8 text-primary-foreground">
        <div className="relative z-10">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            Selamat Datang, {name}! <Hand className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          </h1>
          <p className="mt-1 text-xs sm:text-sm opacity-90">Kelola konten Yayasan Teras Dakwah Indonesia dari sini</p>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary-foreground/10 blur-2xl" />
      </div>

      {/* Unified stats card */}
      <ActivityStatsCard attendance={data.attendance} redemptions={data.redemptions} registrations={data.registrations} logins={[]} events={data.events} programs={data.programs} />

      {/* Grouped menu */}
      <div className="space-y-4 sm:space-y-6">
        <h2 className="font-display text-base sm:text-lg font-bold">Menu Pengelolaan</h2>
        {groups.map((g) => (
          <section key={g.title} className="space-y-2 sm:space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h3>
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
              {g.items.map((it) => {
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className="group relative flex flex-col gap-2 sm:gap-3 rounded-2xl bg-card p-4 sm:p-5 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-primary/40"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      {("tag" in it && (it as any).tag) && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent whitespace-nowrap">{(it as any).tag}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-foreground text-sm">{it.title}</h4>
                      <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground line-clamp-2">{it.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
