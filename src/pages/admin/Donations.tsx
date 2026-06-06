import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, Check, X, Filter } from "lucide-react";
import { useAdmin } from "./AdminLayout";

// Ekstrak path file storage dari URL publik Supabase
const extractStoragePath = (url: string | null): string | null => {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/payment_proofs\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
};

// Buka WhatsApp ke nomor user dengan pesan konfirmasi/penolakan pembayaran
const notifyUserWA = (registration: any, event: any, status: string) => {
  const phone = registration?.profiles?.phone;
  if (!phone) {
    toast.message("User tidak punya nomor WhatsApp — notifikasi dilewati");
    return;
  }
  const name = registration?.profiles?.full_name ?? "Kak";
  const eventTitle = event?.title ?? "event";
  const nominal = registration?.amount_paid
    ? `Rp ${Number(registration.amount_paid).toLocaleString("id-ID")}`
    : "";
  const msg =
    status === "approved"
      ? `Assalamu'alaikum ${name},\n\nJazakallah, pembayaran ${nominal ? nominal + " " : ""}untuk *${eventTitle}* telah kami *TERIMA* ✅\n\nPendaftaran Anda sudah aktif. Silakan Scan QR code untuk menunjukkan kehadiran anda. Jazakumullah khair.`
      : `Assalamu'alaikum ${name},\n\nMohon maaf, pembayaran untuk *${eventTitle}* belum dapat kami konfirmasi dan untuk sementara kami *TOLAK* ❌\n\nMohon cek kembali bukti transfer atau hubungi admin untuk klarifikasi. Terima kasih.`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

export default function DonationsPage() {
  const { registrations, events, reloadRegistrations } = useAdmin();
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Get all registrations with payment info
  const donationRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      const event = events.find((e) => e.id === r.event_id);
      if (!event) return false;

      // Hanya event "paid" yang butuh verifikasi admin. Infaq sukarela diurus langsung via WA.
      if (event.registration_type !== "paid") return false;
      
      // Filter by payment status
      if (filterStatus !== "all" && r.payment_status !== filterStatus) return false;
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          r.profiles?.full_name?.toLowerCase().includes(query) ||
          r.profiles?.phone?.includes(query) ||
          event.title?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [registrations, events, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = donationRegistrations.length;
    const pending = donationRegistrations.filter((r) => r.payment_status === "pending").length;
    const approved = donationRegistrations.filter((r) => r.payment_status === "approved").length;
    const rejected = donationRegistrations.filter((r) => r.payment_status === "rejected").length;
    
    // Calculate total donation amount
    const totalAmount = donationRegistrations.reduce((sum, r) => sum + (r.amount_paid || 0), 0);
    
    return { total, pending, approved, rejected, totalAmount };
  }, [donationRegistrations]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Daftar Pembayaran</h1>
        <p className="text-sm text-muted-foreground">
          Verifikasi pembayaran event berbayar. Bukti dibuka di tab baru &amp; akan otomatis terhapus setelah dikonfirmasi/ditolak.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          ℹ️ Event <strong>Infaq</strong> tidak butuh verifikasi — donatur menghubungi admin langsung lewat WhatsApp.
        </p>
      </div>

      {/* Stats Grid - 3 columns on desktop, 2 on mobile */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
        <StatCard 
          label="TOTAL DONASI" 
          value={`Rp ${stats.totalAmount.toLocaleString("id-ID")}`}
          valueClass="text-blue-600"
        />
        <StatCard 
          label="JUMLAH DONASI" 
          value={stats.total}
          valueClass="text-foreground"
        />
        <StatCard 
          label="AKTIF PROGRAM" 
          value={events.filter(e => e.registration_type !== "free").length}
          valueClass="text-foreground"
        />
      </div>

      {/* Verification Status */}
      <div className="text-xs text-muted-foreground">
        Menunggu verifikasi: <span className="font-semibold text-amber-600">{stats.pending}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg border border-border/40 bg-card p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter</span>
        </div>
        
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Semua Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">Semua</option>
              <option value="pending">Pending</option>
              <option value="approved">Berhasil</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cari</label>
            <Input
              placeholder="Nama / No. HP / Event"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table Header - Desktop only */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campaign</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Nominal</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {donationRegistrations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              donationRegistrations.map((r) => (
                <DonationTableRow 
                  key={r.id} 
                  registration={r} 
                  event={events.find((e) => e.id === r.event_id)} 
                  onChanged={reloadRegistrations}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards - Mobile only */}
      <div className="sm:hidden space-y-2">
        {donationRegistrations.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Tidak ada data
          </div>
        ) : (
          donationRegistrations.map((r) => (
            <DonationMobileCard 
              key={r.id} 
              registration={r} 
              event={events.find((e) => e.id === r.event_id)} 
              onChanged={reloadRegistrations}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  valueClass = "text-foreground" 
}: { 
  label: string; 
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card p-3 sm:p-4">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold ${valueClass} mt-1`}>{value}</p>
    </div>
  );
}

function DonationTableRow({ registration, event, onChanged }: { registration: any; event: any; onChanged: () => Promise<void> | void }) {
  const [updating, setUpdating] = useState(false);

  const update = async (status: string) => {
    setUpdating(true);
    try {
      // Update status terlebih dahulu agar user bisa segera akses QR
      const { error } = await supabase
        .from("registrations")
        .update({ payment_status: status })
        .eq("id", registration.id);
        
      if (error) {
        toast.error(error.message);
        return;
      }

      // Hapus bukti dari storage SETELAH status berhasil diupdate (opsional, tapi bagus untuk hemat storage)
      const path = extractStoragePath(registration.payment_proof_url);
      if (path && status === "approved") {
        await supabase.storage.from("payment_proofs").remove([path]);
        // Update URL menjadi null setelah dihapus dari storage
        await supabase.from("registrations").update({ payment_proof_url: null }).eq("id", registration.id);
      }

      toast.success(status === "approved" ? "Pembayaran disetujui" : "Pembayaran ditolak");
      notifyUserWA(registration, event, status);
      await onChanged();
    } finally {
      setUpdating(false);
    }
  };

  const statusColor = {
    none: "bg-muted text-muted-foreground",
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    approved: "bg-green-50 text-green-700 border border-green-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
  }[registration.payment_status || "none"];

  const statusLabel = {
    pending: "Pending",
    approved: "Berhasil",
    rejected: "Ditolak",
  }[registration.payment_status || "pending"];

  return (
    <>
      <tr className="border-b border-border/20 hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3 text-sm">
          {registration.paid_at
            ? new Date(registration.paid_at).toLocaleDateString("id-ID")
            : "—"}
        </td>
        <td className="px-4 py-3 text-sm font-medium">
          {registration.profiles?.full_name ?? "User"}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {event?.title ?? "Event"}
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-right">
          Rp {(registration.amount_paid || 0).toLocaleString("id-ID")}
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            {registration.payment_proof_url && (
              <a
                href={registration.payment_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors text-xs font-bold border border-blue-200"
                title="Lihat bukti di tab baru"
              >
                <Eye className="h-3.5 w-3.5" /> LIHAT BUKTI
              </a>
            )}
            {registration.payment_status === "pending" && (
              <>
                <button
                  onClick={() => update("approved")}
                  disabled={updating}
                  className="p-2 hover:bg-green-100 text-green-600 rounded-md transition-colors disabled:opacity-50"
                  title="Setujui"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => update("rejected")}
                  disabled={updating}
                  className="p-2 hover:bg-red-100 text-red-600 rounded-md transition-colors disabled:opacity-50"
                  title="Tolak"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}

function DonationMobileCard({ registration, event, onChanged }: { registration: any; event: any; onChanged: () => Promise<void> | void }) {
  const [updating, setUpdating] = useState(false);

  const update = async (status: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("registrations")
        .update({ payment_status: status })
        .eq("id", registration.id);
        
      if (error) {
        toast.error(error.message);
        return;
      }

      const path = extractStoragePath(registration.payment_proof_url);
      if (path && status === "approved") {
        await supabase.storage.from("payment_proofs").remove([path]);
        await supabase.from("registrations").update({ payment_proof_url: null }).eq("id", registration.id);
      }

      toast.success(status === "approved" ? "Pembayaran disetujui" : "Pembayaran ditolak");
      notifyUserWA(registration, event, status);
      await onChanged();
    } finally {
      setUpdating(false);
    }
  };

  const statusColor = {
    none: "bg-muted text-muted-foreground",
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    approved: "bg-green-50 text-green-700 border border-green-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
  }[registration.payment_status || "none"];

  const statusLabel = {
    pending: "Pending",
    approved: "Berhasil",
    rejected: "Ditolak",
  }[registration.payment_status || "pending"];

  return (
    <div className="rounded-lg border border-border/40 bg-card p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {registration.paid_at ? new Date(registration.paid_at).toLocaleDateString("id-ID") : "—"}
          </p>
          <h3 className="font-semibold text-sm truncate">{registration.profiles?.full_name ?? "User"}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{event?.title ?? "Event"}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-sm font-bold">Rp {(registration.amount_paid || 0).toLocaleString("id-ID")}</p>
        <div className="flex items-center gap-1.5">
          {registration.payment_proof_url && (
            <a
              href={registration.payment_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-200"
            >
              <Eye className="h-3 w-3" /> BUKTI
            </a>
          )}
          {registration.payment_status === "pending" && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => update("approved")}
                disabled={updating}
                className="p-1.5 bg-green-50 text-green-600 rounded-md border border-green-200 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => update("rejected")}
                disabled={updating}
                className="p-1.5 bg-red-50 text-red-600 rounded-md border border-red-200 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
