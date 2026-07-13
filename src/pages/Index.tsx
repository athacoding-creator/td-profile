import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Lock, CheckCircle2, UserCircle, CreditCard as CreditCardIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import SEO from "@/components/SEO";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/utils/structuredData";
import { Skeleton } from "@/components/ui/skeleton";


export default function Index() {
  const { profile, user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
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
        setLoading(false);
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
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
                  <div className="space-y-2 px-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              <>
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
              </>
            )}
          </div>
        </section>

        <footer className="container mt-12 flex flex-col items-center gap-6 border-t border-border/60 pt-6 pb-3">
          <div className="flex flex-col items-center gap-4">
            <a 
              href="https://profile.terasdakwah.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-semibold text-foreground hover:text-accent transition-colors"
            >
              Tentang Kami
            </a>
            <a 
              href="https://sedekah.terasdakwah.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-semibold text-foreground hover:text-accent transition-colors"
            >
              Program Kebaikan
            </a>
          </div>
          
          <p className="text-xs text-muted-foreground">© 2014 Teras Dakwah</p>
        </footer>

        <BottomNav />
      </div>
    </>
  );
}
