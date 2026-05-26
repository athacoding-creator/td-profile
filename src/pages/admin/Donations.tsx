import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";
import { formatPhoneDisplay } from "@/lib/phone";

export default function DonationsPage() {
  const { registrations, events } = useAdmin();
  const [filterType, setFilterType] = useState<"all" | "paid" | "infaq">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Get all registrations with payment info
  const donationRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      const event = events.find((e) => e.id === r.event_id);
      if (!event) return false;
      
      // Only show registrations from paid or infaq events
      if (event.registration_type === "free") return false;
      
      // Filter by type
      if (filterType === "paid" && event.registration_type !== "paid") return false;
      if (filterType === "infaq" && event.registration_type !== "infaq") return false;
      
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
  }, [registrations, events, filterType, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = donationRegistrations.length;
    const pending = donationRegistrations.filter((r) => r.payment_status === "pending").length;
    const approved = donationRegistrations.filter((r) => r.payment_status === "approved").length;
    const rejected = donationRegistrations.filter((r) => r.payment_status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [donationRegistrations]);

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Donasi & Pembayaran</h1>
        <p className="text-sm text-muted-foreground">Verifikasi pembayaran & infaq event</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} variant="warning" />
        <StatCard label="Approved" value={stats.approved} variant="success" />
        <StatCard label="Rejected" value={stats.rejected} variant="destructive" />
      </div>

      {/* Filters */}
      <Section title="Filter">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tipe</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="all">Semua</option>
                <option value="paid">Wajib Bayar</option>
                <option value="infaq">Berinfaq</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="all">Semua</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Cari</label>
              <Input
                placeholder="Nama / No. HP / Event"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Donations List */}
      <Section title={`Daftar Donasi & Pembayaran (${donationRegistrations.length})`}>
        {donationRegistrations.length === 0 && (
          <p className="text-sm text-muted-foreground">Tidak ada data.</p>
        )}
        <div className="space-y-2">
          {donationRegistrations.map((r) => (
            <DonationRow key={r.id} registration={r} event={events.find((e) => e.id === r.event_id)} />
          ))}
        </div>
      </Section>
    </>
  );
}

function StatCard({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "warning" | "success" | "destructive" }) {
  const bgColor = {
    default: "bg-muted",
    warning: "bg-amber-50 border-amber-200",
    success: "bg-green-50 border-green-200",
    destructive: "bg-red-50 border-red-200",
  }[variant];

  const textColor = {
    default: "text-foreground",
    warning: "text-amber-700",
    success: "text-green-700",
    destructive: "text-red-700",
  }[variant];

  return (
    <div className={`rounded-lg border ${bgColor} p-3`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

function DonationRow({ registration, event }: { registration: any; event: any }) {
  const [showProof, setShowProof] = useState(false);

  const update = async (status: string) => {
    const { error } = await supabase.from("registrations").update({ payment_status: status }).eq("id", registration.id);
    if (error) return toast.error(error.message);
    toast.success("Status diperbarui");
  };

  const statusColor = {
    none: "bg-muted text-muted-foreground",
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    approved: "bg-green-50 text-green-700 border border-green-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
  }[registration.payment_status || "none"];

  const typeLabel = event?.registration_type === "paid" ? "Wajib Bayar" : "Berinfaq";
  const typeColor = event?.registration_type === "paid" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{event?.title ?? "Event"}</p>
          <p className="text-xs text-muted-foreground">
            {registration.profiles?.full_name ?? "User"}
          </p>
          {registration.profiles?.phone && (
            <a
              href={`https://wa.me/${registration.profiles.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {formatPhoneDisplay(registration.profiles.phone)}
            </a>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}>
            {typeLabel}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
            {registration.payment_status || "none"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Nominal</p>
          <p className="font-semibold">Rp {(registration.amount_paid || 0).toLocaleString("id-ID")}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tanggal</p>
          <p className="font-semibold">
            {registration.paid_at
              ? new Date(registration.paid_at).toLocaleDateString("id-ID")
              : "—"}
          </p>
        </div>
      </div>

      {registration.payment_proof_url && (
        <div className="rounded-lg bg-muted/50 p-2">
          <button
            onClick={() => setShowProof(!showProof)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {showProof ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showProof ? "Sembunyikan" : "Lihat"} Bukti Pembayaran
          </button>
          {showProof && (
            <div className="mt-2 rounded-lg overflow-hidden">
              <img src={registration.payment_proof_url} alt="Bukti Pembayaran" className="max-w-full" />
            </div>
          )}
        </div>
      )}

      {registration.payment_status === "pending" && (
        <div className="flex gap-2 pt-2 border-t border-border/60">
          <Button
            size="sm"
            onClick={() => update("approved")}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="h-3.5 w-3.5 mr-1" /> Setujui
          </Button>
          <Button
            size="sm"
            onClick={() => update("rejected")}
            variant="outline"
            className="flex-1 text-destructive hover:text-destructive"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Tolak
          </Button>
        </div>
      )}
    </div>
  );
}
