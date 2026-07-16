import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { CheckCircle2, Link2, Coins, Home } from "lucide-react";

const DEFAULT_MSG = "Selamat, kamu telah berhasil mendaftar! Sampai jumpa di acara 🎉";

export default function ScanSuccess() {
  const { id } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title,venue,starts_at,group_link,success_message,points_reward")
        .eq("id", id)
        .maybeSingle();
      setEvent(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-md py-20 text-center">
        <div className="space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-accent" />
          <p className="text-muted-foreground">Memproses…</p>
        </div>
      </main>
    </div>
  );

  const message = event?.success_message?.trim() || DEFAULT_MSG;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="container max-w-md py-10">
        <div className="rounded-3xl border border-accent/30 bg-gradient-to-b from-accent/10 to-background p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent/15">
            <CheckCircle2 className="h-12 w-12 text-accent" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Pendaftaran Berhasil 🎉</h1>
          {event?.title && <p className="mt-2 text-sm font-semibold text-foreground/80">{event.title}</p>}
          <p className="mt-4 whitespace-pre-line text-sm text-foreground/80">{message}</p>
          {event?.points_reward > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <Coins className="h-4 w-4" /> +{event.points_reward} poin
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {event?.group_link && (
            <Button variant="outline" className="w-full" asChild>
              <a href={event.group_link} target="_blank" rel="noreferrer">
                <Link2 className="mr-2 h-4 w-4" /> Gabung Grup
              </a>
            </Button>
          )}
          <Button variant="outline" className="w-full" asChild>
            <Link to="/poin">
              <Coins className="mr-2 h-4 w-4" /> Lihat Poin Saya
            </Link>
          </Button>
          <Button className="w-full bg-primary text-primary-foreground" asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" /> Kembali ke Beranda
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}