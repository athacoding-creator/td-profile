import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Section } from "./components";
import { MessageCircle, Search, User as UserIcon, ShieldCheck, ShieldOff } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phone";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Profile = any;

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: me } = useAuth();

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100000),
      supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    setProfiles(data ?? []);
    // Note: while we use user_roles table for listing, 
    // the source of truth for the current user's session is now the has_role RPC.
    setAdminIds(new Set((roles ?? []).map((r: any) => r.user_id)));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const toggleAdmin = async (uid: string, makeAdmin: boolean) => {
    if (uid === me?.id && !makeAdmin) {
      toast.error("Tidak bisa mencabut admin dari akun sendiri");
      return;
    }
    if (makeAdmin) {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      if (error && !/duplicate/i.test(error.message)) return toast.error(error.message);
      toast.success("Sekarang menjadi admin");
    } else {
      if (!confirm("Cabut akses admin dari user ini?")) return;
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin dicabut");
    }
    load();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      [p.full_name, p.phone, p.email, p.city, p.regency_name, p.province_name]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(q))
    );
  }, [profiles, query]);

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Akun</h1>
        <p className="text-sm text-muted-foreground">Lihat data lengkap setiap akun jamaah</p>
      </div>

      <Section title={`Daftar Akun (${filtered.length})`}>
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, WA, kota…"
              className="pl-9 text-sm"
            />
          </div>
        </div>
        {/* Desktop table view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Nama</th>
                <th>WhatsApp</th>
                <th>Gender</th>
                <th>Kota</th>
                <th>Poin</th>
                <th>Status</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">Memuat…</td></tr>}
              {!loading && filtered.map((p) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="py-2">{p.full_name || "—"}</td>
                  <td>
                    {p.phone ? (
                      <a href={`https://wa.me/${p.phone}`} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 text-primary hover:underline">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {formatPhoneDisplay(p.phone)}
                      </a>
                    ) : "—"}
                  </td>
                  <td>{p.gender || "—"}</td>
                  <td>{p.regency_name || p.city || "—"}</td>
                  <td className="font-semibold">{p.points ?? 0}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.is_complete ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
                      {p.is_complete ? "Lengkap" : "Belum lengkap"}
                    </span>
                  </td>
                  <td>
                    {adminIds.has(p.id) ? (
                      <Button size="sm" variant="outline" onClick={() => toggleAdmin(p.id, false)} className="h-7 gap-1 text-xs">
                        <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Admin
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => toggleAdmin(p.id, true)} className="h-7 gap-1 text-xs">
                        <ShieldOff className="h-3.5 w-3.5 text-muted-foreground" /> User
                      </Button>
                    )}
                  </td>
                  <td>
                    <Button size="sm" variant="outline" onClick={() => setSelected(p)}>Detail</Button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">Tidak ada akun</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {loading && <div className="py-4 text-center text-sm text-muted-foreground">Memuat…</div>}
          {!loading && filtered.map((p) => (
            <div key={p.id} className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2.5 flex-1 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center shrink-0 overflow-hidden rounded-full bg-muted text-sm font-bold">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (p.full_name?.charAt(0) || "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.phone ? formatPhoneDisplay(p.phone) : "—"}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                {adminIds.has(p.id) ? (
                  <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-accent/15 text-accent">
                    <ShieldCheck className="h-3 w-3" /> Admin
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    <ShieldOff className="h-3 w-3" /> User
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelected(p)} className="w-full h-8 text-[11px]">Detail</Button>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">Tidak ada akun</div>
          )}
        </div>
      </Section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" /> Detail Akun
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center overflow-hidden rounded-full bg-muted text-lg sm:text-xl font-bold shrink-0">
                  {selected.avatar_url ? (
                    <img src={selected.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (selected.full_name?.charAt(0) || "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm sm:text-base truncate">{selected.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{selected.email || ""}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
                {[
                  ["WhatsApp", selected.phone ? formatPhoneDisplay(selected.phone) : "—"],
                  ["Gender", selected.gender || "—"],
                  ["Tanggal lahir", selected.birth_date || "—"],
                  ["Pekerjaan", selected.occupation || "—"],
                  ["Instansi", selected.instansi || "—"],
                  ["Hobi", selected.hobi || "—"],
                  ["Provinsi", selected.province_name || "—"],
                  ["Kab/Kota", selected.regency_name || selected.city || "—"],
                  ["Kecamatan", selected.district_name || "—"],
                  ["Alamat", selected.address || "—"],
                  ["Poin", String(selected.points ?? 0)],
                  ["Status", selected.is_complete ? "Lengkap" : "Belum lengkap"],
                  ["Bergabung", selected.created_at ? new Date(selected.created_at).toLocaleString("id-ID") : "—"],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="break-words">{v as string}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}