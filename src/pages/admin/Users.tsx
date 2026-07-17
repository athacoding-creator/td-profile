import { confirmDelete } from "@/lib/confirmDelete";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Section } from "./components";
import { MessageCircle, Search, User as UserIcon, ShieldCheck, ShieldOff, Download } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phone";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const buildSearchFilter = (value: string) => {
  const term = value.trim().replace(/[%,()]/g, " ");
  if (!term) return "";

  const pattern = `%${term}%`;
  return [
    "full_name",
    "phone",
    "email",
    "city",
    "regency_name",
    "province_name",
  ].map((column) => `${column}.ilike.${pattern}`).join(",");
};

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [downloading, setDownloading] = useState(false);
  const ITEMS_PER_PAGE = 100;
  const { user: me } = useAuth();

  const loadUsers = useCallback(async (page: number, search: string, from?: string, to?: string) => {
    setLoading(true);
    setCurrentPage(page);
    
    const rangeFrom = page * ITEMS_PER_PAGE;
    const rangeTo = (page + 1) * ITEMS_PER_PAGE - 1;
    const searchFilter = buildSearchFilter(search);
    let profilesQuery = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (searchFilter) {
      profilesQuery = profilesQuery.or(searchFilter);
    }
    if (from) profilesQuery = profilesQuery.gte("created_at", from);
    if (to) profilesQuery = profilesQuery.lte("created_at", `${to}T23:59:59`);

    const [{ data, count, error }, { data: roles }] = await Promise.all([
      profilesQuery,
      supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);

    if (error) {
      toast.error(error.message || "Gagal memuat akun");
      setLoading(false);
      return;
    }

    setTotalCount(typeof count === "number" ? count : 0);
    setProfiles(data ?? []);
    setAdminIds(new Set((roles ?? []).map((r) => r.user_id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers(0, debouncedQuery, dateFrom, dateTo);
    const ch = supabase
      .channel("admin-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadUsers(0, debouncedQuery, dateFrom, dateTo))
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => loadUsers(0, debouncedQuery, dateFrom, dateTo))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [debouncedQuery, dateFrom, dateTo, loadUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

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
      if (!(await confirmDelete({ title: "Cabut akses admin?", description: "Akses admin user ini akan dicabut.", confirmLabel: "Ya, cabut admin" }))) return;
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin dicabut");
    }
    loadUsers(currentPage, debouncedQuery);
  };

  const downloadXLSX = async () => {
    setDownloading(true);
    try {
      let all: any[] = [];
      let page = 0;
      const size = 1000;
      while (true) {
        let q = supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .range(page * size, (page + 1) * size - 1);
        const sf = buildSearchFilter(debouncedQuery);
        if (sf) q = q.or(sf);
        if (dateFrom) q = q.gte("created_at", dateFrom);
        if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);
        const { data, error } = await q;
        if (error) { toast.error(error.message); break; }
        if (!data?.length) break;
        all = all.concat(data);
        if (data.length < size) break;
        page++;
      }
      if (!all.length) { toast.info("Tidak ada akun untuk diunduh"); return; }
      const rows = all.map((p, i) => ({
        No: i + 1,
        "Tanggal Daftar": p.created_at ? new Date(p.created_at).toLocaleString("id-ID") : "-",
        Nama: p.full_name ?? "-",
        WhatsApp: p.phone ? formatPhoneDisplay(p.phone) : "-",
        Email: p.email ?? "-",
        Gender: p.gender === "L" ? "Laki-laki" : p.gender === "P" ? "Perempuan" : (p.gender ?? "-"),
        "Tanggal Lahir": p.birth_date ?? "-",
        Pekerjaan: p.occupation ?? "-",
        Instansi: p.instansi ?? "-",
        Provinsi: p.province_name ?? "-",
        "Kab/Kota": p.regency_name ?? p.city ?? "-",
        Kecamatan: p.district_name ?? "-",
        Alamat: p.address ?? "-",
        Poin: p.points ?? 0,
        Status: p.is_complete ? "Lengkap" : "Belum lengkap",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 5 }, { wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 26 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 30 }, { wch: 8 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Akun");
      const stamp = new Date().toISOString().slice(0, 10);
      const range = dateFrom || dateTo ? `_${dateFrom || "awal"}_${dateTo || "sekarang"}` : "";
      XLSX.writeFile(wb, `akun${range}-${stamp}.xlsx`);
      toast.success(`${all.length} akun diunduh`);
    } finally {
      setDownloading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const isSearching = debouncedQuery.length > 0;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Akun</h1>
          <p className="text-sm text-muted-foreground">Lihat data lengkap setiap akun jamaah</p>
        </div>
        <Button onClick={downloadXLSX} disabled={downloading} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "Menyiapkan…" : `Download Excel (${totalCount})`}
        </Button>
      </div>

      <Section title={`Daftar Akun (${isSearching ? "Hasil: " : "Total: "}${totalCount})`}>
        <div className="mb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
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
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="flex-1">
              <label className="text-[11px] text-muted-foreground">Dari tanggal</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-muted-foreground">Sampai tanggal</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="outline" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }} className="h-9">
                Reset
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Halaman {currentPage + 1} • Menampilkan {profiles.length} dari {totalCount} akun
            </span>
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
              {!loading && profiles.map((p) => (
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
              {!loading && profiles.length === 0 && (
                <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">{isSearching ? "Akun tidak ditemukan" : "Tidak ada akun"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {loading && <div className="py-4 text-center text-sm text-muted-foreground">Memuat…</div>}
          {!loading && profiles.map((p) => (
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
          {!loading && profiles.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">{isSearching ? "Akun tidak ditemukan" : "Tidak ada akun"}</div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && totalCount > ITEMS_PER_PAGE && (
          <div className="mt-6 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUsers(currentPage - 1, debouncedQuery)}
              disabled={currentPage === 0}
            >
              Sebelumnya
            </Button>
            <span className="text-xs text-muted-foreground">
              Halaman {currentPage + 1} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUsers(currentPage + 1, debouncedQuery)}
              disabled={currentPage >= totalPages - 1}
            >
              Selanjutnya
            </Button>
          </div>
        )}
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
