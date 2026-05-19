import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { MapPin, Calendar, Users, Lock, Link2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function EventDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("events")
        .select("id,title,description,venue,city,starts_at,ends_at,status,gender,event_type,poster_url,group_link,points_reward,program_id,created_at")
        .eq("id", id).maybeSingle();
      setEvent(data);
      if (user && data) {
        const { data: r } = await supabase
          .from("registrations")
          .select("id")
          .eq("event_id", data.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setRegistered(!!r);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const register = async () => {
    if (!user) return navigate("/auth");
    if (!profile?.is_complete) {
      toast.error("Lengkapi profil dulu di halaman Profil.");
      return navigate("/profil");
    }
    setSubmitting(true);
    const { error } = await supabase.from("registrations").insert({ event_id: event.id, user_id: user.id });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setRegistered(true);
    toast.success("Pendaftaran berhasil!");
  };

  if (loading) return <div className="container py-20 text-center text-muted-foreground">Memuat…</div>;
  if (!event) return <div className="container py-20 text-center">Event tidak ditemukan</div>;

  const genderMismatch =
    user && profile?.gender && event.gender !== "ALL" && event.gender !== profile.gender;
  const endTime = event.ends_at ? new Date(event.ends_at) : new Date(new Date(event.starts_at).getTime() + 6 * 3600 * 1000);
  const expired = Date.now() > endTime.getTime() || event.status === "archived";

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="container max-w-3xl py-8">
        <button
          onClick={() => navigate("/events")}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali ke Event
        </button>
        {event.poster_url && (
          <div className="overflow-hidden rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }}>
            <img src={event.poster_url} alt={event.title} className="w-full" />
          </div>
        )}
        <h1 className="mt-6 font-display text-3xl font-bold text-foreground">{event.title}</h1>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            {format(new Date(event.starts_at), "EEEE, d MMM yyyy • HH:mm", { locale: idLocale })}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            {event.venue}
            {event.city ? `, ${event.city}` : ""}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            {event.gender === "ALL" ? "Umum (L & P)" : event.gender === "L" ? "Khusus Laki-laki" : "Khusus Perempuan"}
          </div>
        </div>
        {event.description && (
          <p className="mt-6 whitespace-pre-line text-foreground/80">{event.description}</p>
        )}

        <div className="mt-8 space-y-3">
          {expired ? (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">
              <Lock className="h-4 w-4" /> Event Expired — pendaftaran & absensi ditutup.
            </div>
          ) : genderMismatch ? (
            <div className="flex items-center gap-2 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" /> Event ini tidak sesuai dengan gender profilmu.
            </div>
          ) : registered ? (
            <>
              <div className="rounded-xl bg-accent/10 p-4 text-center font-semibold text-accent">
                ✓ Kamu sudah terdaftar
              </div>
              <Link to={`/event/${event.id}/scan`}>
                <Button className="w-full bg-primary text-primary-foreground">Scan QR Absensi</Button>
              </Link>
              {event.group_link && (
                <a href={event.group_link} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full">
                    <Link2 className="mr-2 h-4 w-4" /> Gabung Grup
                  </Button>
                </a>
              )}
            </>
          ) : (
            <Button
              onClick={register}
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground"
            >
              {submitting ? "Mendaftarkan…" : user ? "Daftar Event" : "Login untuk Daftar"}
            </Button>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
