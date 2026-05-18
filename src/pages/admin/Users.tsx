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
import { MessageCircle, Search, User as UserIcon } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phone";

type Profile = any;

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    setProfiles(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

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
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Nama</th>
                <th>WhatsApp</th>
                <th>Gender</th>
                <th>Kota</th>
                <th>Poin</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">Memuat…</td></tr>}
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
                    <Button size="sm" variant="outline" onClick={() => setSelected(p)}>Detail</Button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">Tidak ada akun</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" /> Detail Akun
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-muted text-xl font-bold">
                  {selected.avatar_url ? (
                    <img src={selected.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (selected.full_name?.charAt(0) || "?").toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{selected.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{selected.email || ""}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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