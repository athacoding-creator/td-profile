import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { StackedDonorCards } from "@/components/ui/stacked-donor-cards";

type Donor = {
  id: string;
  full_name: string;
  amount_paid: number | null;
  donor_message: string | null;
  paid_at: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s} detik lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} minggu lalu`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} bulan lalu`;
  return `${Math.floor(d / 365)} tahun lalu`;
}

export default function DonorWall({ eventId }: { eventId: string }) {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("get_event_donors", { _event_id: eventId });
      if (cancelled) return;
      if (!error && data) setDonors(data as Donor[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground mt-2">Memuat doa...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <div className="text-center mb-4">
        <h3 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">
          Dinding <span className="text-primary">Doa</span>
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Kumpulan doa & dukungan dari para donatur</p>
      </div>

      {donors.length === 0 ? (
        <div className="py-8 px-4 rounded-xl bg-muted/30 border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          <p className="mb-1">Belum ada doa yang terkirim.</p>
          <p>Jadilah yang pertama memberikan doa terbaikmu 🤲</p>
        </div>
      ) : (
        <StackedDonorCards donors={donors} timeAgo={timeAgo} />
      )}
    </div>
  );
}
