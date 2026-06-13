import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Lock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import SEO from "@/components/SEO";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/utils/structuredData";


export default function Index() {
  const { profile, user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("events")
      .select("id,title,venue,poster_url,gender,starts_at,ends_at,status,is_pinned")
      .in("status", ["active", "finished"])
      .order("is_pinned", { ascending: false })
      .order("starts_at", { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (error) {
          console.error("loadIndexEvents error", error);
        }
        setEvents(data ?? []);
      });
  }, []);

  // Combine organization and website schema
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      generateOrganizationSchema(),
      generateWebsiteSchema(),
    ],
  };

  return (
    <>
      <SEO 
        title="Teras Dakwah — Tiket Kajian & Event Islami"
        description="Platform tiket Teras Dakwah. Temukan kajian, talkshow, dan event Islami terbaru di kota terdekatmu."
        keywords="kajian islam, event islami, talkshow islam, tiket event, dakwah, ceramah, ustadz"
        url="https://terasdakwah.com"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-background pb-24">
        <Header />


        <section className="container mt-4 md:mt-6">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">Event terbaru</h2>
            <Link to="/event" className="text-sm text-accent hover:underline">Lihat semua →</Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {events.map((e) => {
              const locked = profile?.gender && e.gender !== "ALL" && e.gender !== profile.gender;
              const endTime = e.ends_at ? new Date(e.ends_at).getTime() : new Date(e.starts_at).getTime() + 6 * 3600 * 1000;
              const finished = e.status === "finished" || Date.now() > endTime;
              return (
                <Link
                  to={`/event/${e.id}`}
                  key={e.id}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl bg-card transition-all duration-300 hover:-translate-y-1"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    {e.poster_url ? (
                      <img src={e.poster_url} alt={e.title} loading="lazy" className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${locked || finished ? "grayscale" : ""}`} />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">No poster</div>
                    )}
                  </div>
                  {locked && (
                    <div className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  {!locked && finished && (
                    <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Selesai
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

        <footer className="container mt-12 flex flex-col items-center gap-3 border-t border-border/60 pt-4 pb-1">
          <p className="text-xs text-muted-foreground">© 2014 Teras Dakwah</p>
        </footer>

        <BottomNav />
      </div>
    </>
  );
}
