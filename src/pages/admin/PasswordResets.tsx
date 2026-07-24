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
import { Search, Copy, CheckCircle2, AlertCircle, MessageCircle } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phone";
import { toast } from "sonner";

type PasswordReset = Database["public"]["Tables"]["password_resets"]["Row"];

const buildSearchFilter = (value: string) => {
  const term = value.trim().replace(/[%,()]/g, " ");
  if (!term) return "";

  const pattern = `%${term}%`;
  return [
    "phone",
    "message",
  ].map((column) => `${column}.ilike.${pattern}`).join(",");
};

export default function PasswordResetsPage() {
  const [resets, setResets] = useState<PasswordReset[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<PasswordReset | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const ITEMS_PER_PAGE = 50;

  const loadResets = useCallback(async (page: number, search: string, from?: string, to?: string) => {
    setLoading(true);
    setCurrentPage(page);
    
    const rangeFrom = page * ITEMS_PER_PAGE;
    const rangeTo = (page + 1) * ITEMS_PER_PAGE - 1;
    const searchFilter = buildSearchFilter(search);
    let resetsQuery = supabase
      .from("password_resets")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (searchFilter) {
      resetsQuery = resetsQuery.or(searchFilter);
    }
    if (from) resetsQuery = resetsQuery.gte("created_at", from);
    if (to) resetsQuery = resetsQuery.lte("created_at", `${to}T23:59:59`);

    const { data, count, error } = await resetsQuery;

    if (error) {
      toast.error(error.message || "Gagal memuat data reset password");
      setLoading(false);
      return;
    }

    setTotalCount(typeof count === "number" ? count : 0);
    setResets(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadResets(0, debouncedQuery, dateFrom, dateTo);
    const ch = supabase
      .channel("admin-password-resets")
      .on("postgres_changes", { event: "*", schema: "public", table: "password_resets" }, () => loadResets(0, debouncedQuery, dateFrom, dateTo))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [debouncedQuery, dateFrom, dateTo, loadResets]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Pesan disalin ke clipboard");
  };

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const isSearching = debouncedQuery.length > 0;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Reset Password</h1>
          <p className="text-sm text-muted-foreground">Kelola permintaan reset password dari user</p>
        </div>
      </div>

      <Section title={`Permintaan Reset Password (${isSearching ? "Hasil: " : "Total: "}${totalCount})`}>
        <div className="mb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nomor WA atau pesan…"
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
              Halaman {currentPage + 1} • Menampilkan {resets.length} dari {totalCount} permintaan
            </span>
          </div>
        </div>

        {/* Desktop table view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Tanggal</th>
                <th>Nomor WA</th>
                <th>Status Kirim</th>
                <th>Pesan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Memuat…</td></tr>}
              {!loading && resets.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-2 text-xs">
                    {r.created_at ? new Date(r.created_at).toLocaleString("id-ID") : "—"}
                  </td>
                  <td>
                    <a href={`https://wa.me/${r.phone}`} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 text-primary hover:underline">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {formatPhoneDisplay(r.phone)}
                    </a>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {r.delivered ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-green-600">Terkirim</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-medium text-amber-600">Belum terkirim</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="max-w-xs truncate text-xs text-muted-foreground">{r.message || "—"}</td>
                  <td>
                    <Button size="sm" variant="outline" onClick={() => setSelected(r)}>Detail</Button>
                  </td>
                </tr>
              ))}
              {!loading && resets.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">{isSearching ? "Permintaan tidak ditemukan" : "Tidak ada permintaan"}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {loading && <div className="py-4 text-center text-sm text-muted-foreground">Memuat…</div>}
          {!loading && resets.map((r) => (
            <div key={r.id} className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleString("id-ID") : "—"}
                  </p>
                  <p className="font-medium text-sm mt-1">
                    <a href={`https://wa.me/${r.phone}`} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 text-primary hover:underline">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {formatPhoneDisplay(r.phone)}
                    </a>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {r.delivered ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Terkirim</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-600">Belum</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{r.message || "—"}</p>
              <Button size="sm" variant="outline" onClick={() => setSelected(r)} className="w-full h-8 text-[11px]">Detail</Button>
            </div>
          ))}
          {!loading && resets.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">{isSearching ? "Permintaan tidak ditemukan" : "Tidak ada permintaan"}</div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && totalCount > ITEMS_PER_PAGE && (
          <div className="mt-6 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadResets(currentPage - 1, debouncedQuery, dateFrom, dateTo)}
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
              onClick={() => loadResets(currentPage + 1, debouncedQuery, dateFrom, dateTo)}
              disabled={currentPage >= totalPages - 1}
            >
              Selanjutnya
            </Button>
          </div>
        )}
      </Section>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Permintaan Reset Password</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nomor WhatsApp</label>
                <p className="mt-1 text-sm font-medium">{formatPhoneDisplay(selected.phone)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Tanggal Permintaan</label>
                <p className="mt-1 text-sm">
                  {selected.created_at ? new Date(selected.created_at).toLocaleString("id-ID") : "—"}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Status Pengiriman</label>
                <div className="mt-1 flex items-center gap-2">
                  {selected.delivered ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Terkirim via WhatsApp Gateway</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-600">Belum terkirim (gateway tidak aktif)</span>
                    </>
                  )}
                </div>
                {selected.delivery_error && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    Error: {selected.delivery_error}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Pesan Password</label>
                <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                  {selected.message || "—"}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(selected.message || "")}
                  className="flex-1"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Salin Pesan
                </Button>
                <Button
                  size="sm"
                  onClick={() => openWhatsApp(selected.phone)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Buka WA
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
