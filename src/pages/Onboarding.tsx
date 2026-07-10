import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const [gender, setGender] = useState<"L" | "P" | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    if (!user || !gender) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ gender }).eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center">
      <div className="container max-w-md">
        <h1 className="font-display text-3xl font-bold text-foreground">Pilih gender</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Diperlukan agar kamu hanya melihat event sesuai peruntukannya.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4">
          {(["L", "P"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`rounded-2xl border-2 p-8 text-center transition ${
                gender === g ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
              }`}
            >
              <div className="text-4xl">{g === "L" ? "👨" : "👩"}</div>
              <div className="mt-3 font-semibold text-foreground">
                {g === "L" ? "Laki-laki" : "Perempuan"}
              </div>
            </button>
          ))}
        </div>
        <Button
          onClick={submit}
          disabled={!gender || loading}
          className="mt-8 w-full bg-primary text-primary-foreground"
        >
          {loading ? "Menyimpan…" : "Lanjutkan"}
        </Button>
      </div>
    </div>
  );
}
