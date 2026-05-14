import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { HeroSlider } from "@/components/HeroSlider";

export default function Index() {
  const { profile, user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("events")
      .select("id,title,venue,poster_url,gender,starts_at")
      .eq("status", "active")
      .gte("starts_at", cutoff)
      .order("starts_at", { ascending: true })
      .limit(24)
      .then(({ data }) => setEvents(data ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <HeroSlider />

      <section className="container mt-4 md:mt-6">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">Event terbaru</h2>
          <Link to="/arsip" className="text-sm text-accent hover:underline">Lihat arsip →</Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {events.map((e) => {
            const locked = profile?.gender && e.gender !== "ALL" && e.gender !== profile.gender;
            return (
              <Link
                to={`/event/${e.id}`}
                key={e.id}
                className="group relative cursor-pointer overflow-hidden rounded-2xl bg-card transition-all duration-300 hover:-translate-y-1"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="aspect-[3/4] overflow-hidden">
                  {e.poster_url ? (
                    <img src={e.poster_url} alt={e.title} loading="lazy" className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${locked ? "grayscale" : ""}`} />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">No poster</div>
                  )}
                </div>
                {locked && (
                  <div className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-2 p-4">
                  <h3 className="line-clamp-2 font-semibold text-sm md:text-base text-foreground group-hover:text-accent transition-colors">{e.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
                    <span className="line-clamp-1">{e.venue}</span>
                  </div>
                </div>
              </Link>
            );
          })}
          {!events.length && (
            <p className="col-span-full py-12 text-center text-sm text-muted-foreground">Belum ada event.</p>
          )}
        </div>
      </section>

      <footer className="container mt-16 flex flex-col items-center gap-3 border-t border-border/60 pt-8 pb-6">
        <img
          src="https://res.cloudinary.com/dfjvcvbsn/image/upload/v1768960205/TD_Logo_Resmi_qae5bg.png"
          alt="Teras Dakwah"
          className="h-14 w-auto"
        />
        <p className="text-xs text-muted-foreground">© 2014 Teras Dakwah</p>
      </footer>

      <BottomNav />
    </div>
  );
}
