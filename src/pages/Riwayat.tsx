import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Check, Clock } from "lucide-react";

export default function Riwayat() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: regs } = await supabase
        .from("registrations")
        .select("id, created_at, payment_status, events(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const { data: atts } = await supabase.from("attendance").select("event_id").eq("user_id", user.id);
      const attended = new Set((atts ?? []).map((a) => a.event_id));
      setItems((regs ?? []).map((r: any) => ({ ...r, attended: attended.has(r.events.id) })));
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container py-8">
        <h1 className="font-display text-2xl font-bold">Event Saya</h1>
        <div className="mt-6 space-y-3">
          {items.map((it) => (
            <Link
              to={`/event/${it.events.id}`}
              key={it.id}
              className="flex items-center gap-4 rounded-2xl bg-card p-4 transition hover:-translate-y-0.5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {it.events.poster_url && (
                <img src={it.events.poster_url} className="h-16 w-16 rounded-lg object-cover" alt="" />
              )}
              <div className="flex-1">
                <h3 className="line-clamp-1 font-semibold">{it.events.title}</h3>
                <p className="text-xs text-muted-foreground">{it.events.venue}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {it.attended ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-accent">
                    <Check className="h-3.5 w-3.5" /> Hadir
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Terdaftar
                  </span>
                )}
                {it.payment_status === "pending" && (
                  <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">Menunggu Verifikasi</span>
                )}
                {it.payment_status === "rejected" && (
                  <span className="text-[10px] text-destructive font-medium bg-destructive/5 px-1.5 py-0.5 rounded">Ditolak</span>
                )}
                {it.payment_status === "approved" && (
                  <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">Lunas</span>
                )}
              </div>
            </Link>
          ))}
          {!items.length && <p className="text-sm text-muted-foreground">Belum ada event.</p>}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
