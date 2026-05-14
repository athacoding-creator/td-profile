import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

export default function Archive() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("events")
      .select("id,title,venue,poster_url,starts_at,ends_at")
      .lt("starts_at", cutoff)
      .order("starts_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setEvents(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">Arsip Event</h1>
        <p className="text-sm text-muted-foreground">Event yang sudah berlangsung lebih dari 30 hari.</p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {events.map((e) => (
            <Link
              to={`/event/${e.id}`}
              key={e.id}
              className="group overflow-hidden rounded-2xl bg-card opacity-90 hover:opacity-100"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="aspect-[3/4] overflow-hidden">
                {e.poster_url ? (
                  <img src={e.poster_url} alt={e.title} loading="lazy" className="h-full w-full object-cover grayscale" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">No poster</div>
                )}
              </div>
              <div className="space-y-1 p-3">
                <h3 className="line-clamp-2 text-sm font-semibold">{e.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.starts_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> <span className="line-clamp-1">{e.venue}</span>
                </div>
              </div>
            </Link>
          ))}
          {!events.length && (
            <p className="col-span-full py-12 text-center text-sm text-muted-foreground">Belum ada arsip.</p>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
