import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";

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
  const [visible, setVisible] = useState(3);

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

  const shown = useMemo(() => donors.slice(0, visible), [donors, visible]);
  const hasMore = visible < donors.length;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-5 text-center">
        <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-1">
        <h3 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">
          Doa <span>Terbaik</span>
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">Dinding doa &amp; dukungan terbaik</p>
      </div>

      {donors.length === 0 ? (
        <div className="mt-4 rounded-xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
          Jadilah yang pertama berinfaq atau memberikan doa terbaikmu 🤲
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {shown.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-border/40 bg-background p-3 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{d.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.amount_paid && d.amount_paid > 0 ? (
                      <>
                        Donasi{" "}
                        <span className="font-bold text-primary">
                          Rp {d.amount_paid.toLocaleString("id-ID")}
                        </span>
                      </>
                    ) : (
                      <span className="font-medium text-rose-500">Memberikan Doa Terbaik</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(d.paid_at)}</span>
              </div>
              {d.donor_message && (
                <p className="mt-1.5 text-xs italic text-foreground/80 leading-relaxed">
                  &ldquo;{d.donor_message}&rdquo;
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <Button
          variant="outline"
          onClick={() => setVisible((v) => v + 3)}
          className="mt-3 w-full text-xs sm:text-sm"
        >
          <Heart className="mr-2 h-3.5 w-3.5 text-rose-500" /> Tampilkan doa lainnya ({donors.length - visible})
        </Button>
      )}
    </div>
  );
}
