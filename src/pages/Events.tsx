import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Lock, CheckCircle2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { isEventExpired, isRecurring } from "@/lib/eventSchedule";
import { Skeleton } from "@/components/ui/skeleton";

type Ev = {
  id: string;
  title: string;
  venue: string;
  poster_url: string | null;
  gender: string;
  starts_at: string;
  ends_at: string | null;
  status: string;
  is_pinned?: boolean;
  is_recurring?: boolean;
  recurring_days?: number[] | null;
  recurring_start_time?: string | null;
  recurring_end_time?: string | null;
  recurring_until?: string | null;
  is_online?: boolean;
};

export default function Events() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState<string>("ALL");

  useEffect(() => {
    setLoading(true);
    supabase
      .from("events")
      .select("id,title,venue,poster_url,gender,starts_at,ends_at,status,is_pinned,is_recurring,recurring_days,recurring_start_time,recurring_end_time,recurring_until,is_online")
      .in("status", ["active", "finished"])
      .order("is_pinned", { ascending: false })
      .order("starts_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) {
          console.error("loadEvents error", error);
        }
        setEvents((data ?? []) as Ev[]);
        setLoading(false);
      });
  }, []);

  // Filter events based on search query and gender
  const filteredEvents = events.filter((e) => {
    const matchesSearch = searchQuery === "" || 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGender = filterGender === "ALL" || e.gender === "ALL" || e.gender === filterGender;
    
    return matchesSearch && matchesGender;
  });

  const upcoming = filteredEvents
    .filter((e) => e.status === "active" && !isEventExpired(e))
    .sort((a, b) => {
      if (!!b.is_pinned !== !!a.is_pinned) return b.is_pinned ? 1 : -1;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
  const finished = filteredEvents.filter((e) => e.status === "finished" || isEventExpired(e));

  const Card = ({ e, isFinished }: { e: Ev; isFinished: boolean }) => {
    const locked = profile?.gender && e.gender !== "ALL" && e.gender !== profile.gender;
    return (
      <Link
        to={`/event/${e.id}`}
        className="group relative cursor-pointer overflow-hidden rounded-2xl bg-card transition-all duration-300 hover:-translate-y-1"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="aspect-[3/4] overflow-hidden">
          {e.poster_url ? (
            <img
              src={e.poster_url}
              alt={e.title}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                locked || isFinished ? "grayscale" : ""
              }`}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">No poster</div>
          )}
        </div>
        {locked && (
          <div className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {!locked && isFinished && (
          <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" /> Selesai
          </div>
        )}
        <div className="space-y-2 p-4">
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-accent transition-colors md:text-base">
            {e.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground md:text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="line-clamp-1">{e.venue}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {new Date(e.starts_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container py-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Event</h1>
        <p className="text-sm text-muted-foreground">Semua event mendatang dan yang telah selesai.</p>

        {/* Search and Filter Section */}
        <section className="mt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Search Results Info */}
          {searchQuery && (
            <p className="text-sm text-muted-foreground">
              Ditemukan {upcoming.length + finished.length} event untuk "{searchQuery}"
            </p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-display text-lg font-semibold text-foreground">Event Mendatang</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
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
                {upcoming.map((e) => <Card key={e.id} e={e} isFinished={false} />)}
                {!upcoming.length && (
                  <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Belum ada event mendatang.</p>
                )}
              </>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-foreground">Event Selesai</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
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
                {finished.map((e) => <Card key={e.id} e={e} isFinished={true} />)}
                {!finished.length && (
                  <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Belum ada event selesai.</p>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}