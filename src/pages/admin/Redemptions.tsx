import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";

export default function RedemptionsPage() {
  const { redemptions } = useAdmin();
  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Penukaran Poin</h1>
        <p className="text-sm text-muted-foreground">Realtime — verifikasi permintaan reward jamaah</p>
      </div>
      <Section title="Daftar Penukaran">
        {redemptions.length === 0 && <p className="text-sm text-muted-foreground">Belum ada penukaran.</p>}
        <div className="space-y-2">
          {redemptions.map((r) => <RedemptionRow key={r.id} r={r} />)}
        </div>
      </Section>
    </>
  );
}

function RedemptionRow({ r }: { r: any }) {
  const update = async (status: string) => {
    const { error } = await supabase.from("redemptions").update({ status }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Status diperbarui");
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 p-3 text-sm">
      <div>
        <p className="font-medium">{r.rewards?.name ?? "Reward"}</p>
        <p className="text-xs text-muted-foreground">
          {r.cost_points} pts · {new Date(r.created_at).toLocaleString("id-ID")}
        </p>
        <p className="text-[11px] text-muted-foreground">{r.profiles?.full_name || r.user_id.slice(0, 8)}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "approved" ? "bg-accent/15 text-accent" : r.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-muted"}`}>
          {r.status}
        </span>
        {r.status === "pending" && (
          <>
            <Button size="sm" variant="outline" onClick={() => update("approved")}>Setujui</Button>
            <Button size="sm" variant="outline" onClick={() => update("rejected")}>Tolak</Button>
          </>
        )}
      </div>
    </div>
  );
}
