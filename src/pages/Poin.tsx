import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getReasonLabel } from "@/utils/pointReasons";
import { AlertCircle } from "lucide-react";

export default function Poin() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [lastRedeem, setLastRedeem] = useState<string | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(true);

  const loadRedeems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("redemptions")
      .select("created_at, status")
      .eq("user_id", user.id)
      .neq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(1);
    setLastRedeem(data?.[0]?.created_at ?? null);
  };

  useEffect(() => {
    supabase.from("rewards").select("*").eq("is_active", true).then(({ data }) => setRewards(data ?? []));
    if (user) {
      supabase
        .from("point_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => setTxns(data ?? []));
      loadRedeems();
    }
  }, [user]);

  const cooldownUntil = lastRedeem ? new Date(new Date(lastRedeem).getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const onCooldown = cooldownUntil && cooldownUntil > new Date();

  const redeem = async (r: any) => {
    if (!user) return;
    if (!profile?.is_complete) {
      toast.error("Lengkapi profil dulu");
      return navigate("/profil");
    }
    if (onCooldown) {
      return toast.error(`Kamu sudah menukar bulan ini. Coba lagi setelah ${cooldownUntil!.toLocaleDateString("id-ID")}`);
    }
    if ((profile?.points ?? 0) < r.cost_points) return toast.error("Poin tidak cukup");
    const { error } = await supabase.from("redemptions").insert({
      user_id: user.id,
      reward_id: r.id,
      cost_points: r.cost_points,
      status: "pending",
    });
    if (error) return toast.error(error.message);
    await refreshProfile();
    await loadRedeems();
    toast.success("Penukaran diproses!");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container py-8">
        <div className="rounded-2xl p-8 text-center bg-primary text-primary-foreground">
          <p className="text-sm opacity-80">Poin kamu</p>
          <p className="mt-2 font-display text-5xl font-black">{profile?.points ?? 0}</p>
        </div>

        {onCooldown && (
          <div className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            Kamu sudah menukar bulan ini. Bisa tukar lagi mulai{" "}
            <span className="font-semibold text-foreground">
              {cooldownUntil!.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </span>.
          </div>
        )}

        <h2 className="mt-8 font-display text-lg font-semibold">Tukar Reward</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {rewards.map((r) => (
            <div key={r.id} className="rounded-2xl bg-card p-3" style={{ boxShadow: "var(--shadow-card)" }}>
              {r.image_url && <img src={r.image_url} alt={r.name} className="aspect-square w-full rounded-xl object-cover" />}
              <h3 className="mt-2 text-sm font-semibold line-clamp-1">{r.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-accent">{r.cost_points} pts</span>
                <Button size="sm" disabled={!!onCooldown} onClick={() => redeem(r)}>Tukar</Button>
              </div>
            </div>
          ))}
          {!rewards.length && <p className="col-span-2 text-sm text-muted-foreground">Belum ada reward.</p>}
        </div>

        <h2 className="mt-10 font-display text-xl font-semibold">Riwayat Poin</h2>
        <div className="mt-4 space-y-2">
          {txns.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-card p-3 text-sm">
              <span className="text-foreground">{getReasonLabel(t.reason)}</span>
              <span className={t.amount >= 0 ? "font-semibold text-accent" : "font-semibold text-destructive"}>
                {t.amount >= 0 ? "+" : ""}{t.amount}
              </span>
            </div>
          ))}
          {!txns.length && <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>}
        </div>
      </main>

      {/* Terms Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
              <AlertCircle className="h-6 w-6 text-accent" />
            </div>
            <DialogTitle className="text-xl font-bold">Syarat Penukaran</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-foreground/80">
              Mohon baca dan pahami syarat penukaran reward berikut
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-4">
            <div className="flex gap-2.5">
              <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-accent" />
              <span className="text-sm text-foreground/80">Mengambil di Teras Dakwah setelah kajian berlangsung</span>
            </div>
            <div className="flex gap-2.5">
              <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-accent" />
              <span className="text-sm text-foreground/80">Bersedia untuk didokumentasikan</span>
            </div>
            <div className="flex gap-2.5">
              <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-accent" />
              <span className="text-sm text-foreground/80">Menunjukkan akun</span>
            </div>
            <div className="flex gap-2.5">
              <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-accent" />
              <span className="text-sm text-foreground/80">Story Instagram dan tag Teras Dakwah</span>
            </div>
            <div className="flex gap-2.5">
              <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-accent" />
              <span className="text-sm text-foreground/80">Sebulan hanya bisa menukar 1 jenis item</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowTermsDialog(false)}
            >
              Mengerti
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
