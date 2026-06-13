import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";
import { MessageCircle, ChevronDown, Users, X, Download } from "lucide-react";
import * as XLSX from "xlsx";

export default function PendaftarPage() {
  const { events, registrations } = useAdmin();
  const [eventFilter, setEventFilter] = useState<string>("");
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [searchPast, setSearchPast] = useState("");

  const filtered = eventFilter ? registrations.filter((r) => r.event_id === eventFilter) : registrations;
  const counts: Record<string, number> = {};
  registrations.forEach((r) => { counts[r.event_id] = (counts[r.event_id] || 0) + 1; });

  const activeEvents = events.filter((e) => e.status === "active");
  const pastEvents = events.filter((e) => e.status !== "active");
  const filteredPastEvents = pastEvents.filter((e) =>
    e.title?.toLowerCase().includes(searchPast.toLowerCase())
  );

  const eventById = useMemo(() => {
    const m: Record<string, any> = {};
    events.forEach((e) => { m[e.id] = e; });
    return m;
  }, [events]);

  const fmtRp = (n: number | null | undefined) =>
    n && n > 0 ? `Rp ${Number(n).toLocaleString("id-ID")}` : "—";

  const exportXLSX = () => {
    const ev = eventFilter ? events.find((e) => e.id === eventFilter) : null;
    const rows = filtered.map((r, i) => ({
      No: i + 1,
      "Tanggal Daftar": new Date(r.created_at).toLocaleString("id-ID"),
      Nama: r.profiles?.full_name ?? "-",
      WhatsApp: r.profiles?.phone ?? "-",
      Gender:
        r.profiles?.gender === "L"
          ? "Laki-laki"
          : r.profiles?.gender === "P"
          ? "Perempuan"
          : (r.profiles?.gender ?? "-"),
      Kota: r.profiles?.city ?? "-",
      Email: r.profiles?.email ?? "-",
      Event: r.events?.title ?? (eventFilter ? "-" : "Semua Event"),
      Nominal: r.amount_paid && r.amount_paid > 0 ? Number(r.amount_paid) : 0,
      "Pesan Doa": r.donor_message ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 }, { wch: 22 }, { wch: 28 }, { wch: 16 },
      { wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 36 },
      { wch: 14 }, { wch: 40 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pendaftar");
    const slug = (ev?.title || "semua-event")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `pendaftar-${slug}-${stamp}.xlsx`);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Pendaftar</h1>
          <p className="text-sm text-muted-foreground">Persiapan lokasi berdasarkan jumlah jamaah yang daftar</p>
        </div>
        <Button onClick={exportXLSX} disabled={filtered.length === 0} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Download Excel ({filtered.length})
        </Button>
      </div>

      <Section title="Pilih Event">
        <div className="space-y-3">
          {activeEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event Aktif</p>
              <div className="grid gap-2 sm:gap-2.5 grid-cols-1 sm:grid-cols-2">
                {activeEvents.map((e) => (
                  <button key={e.id} onClick={() => setEventFilter(e.id)}
                    className={`rounded-xl border p-3 text-left transition ${eventFilter === e.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60 hover:border-border"}`}>
                    <p className="font-medium text-sm">{e.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{e.programs?.code}</span>
                      <p className="text-xs text-muted-foreground">{counts[e.id] || 0} pendaftar</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-xl border border-border/40 bg-muted/20 p-3">
            <button onClick={() => setShowPastEvents(!showPastEvents)}
              className="flex w-full items-center justify-between text-sm font-medium text-foreground hover:text-primary transition">
              <span className="flex items-center gap-2">
                <ChevronDown className={`h-4 w-4 transition ${showPastEvents ? "rotate-180" : ""}`} />
                Total Event ({pastEvents.length})
              </span>
            </button>

            {showPastEvents && (
              <div className="space-y-3 pt-3">
                <Input
                  placeholder="Cari event..."
                  value={searchPast}
                  onChange={(e) => setSearchPast(e.target.value)}
                  className="h-9 text-sm rounded-lg"
                />
                <div className="grid gap-2 sm:gap-2.5 grid-cols-1 sm:grid-cols-2 max-h-64 overflow-y-auto pr-1">
                  {filteredPastEvents.map((e) => (
                    <button key={e.id} onClick={() => { setEventFilter(e.id); setShowPastEvents(false); }}
                      className={`rounded-lg border p-3 text-left transition text-sm ${eventFilter === e.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60 hover:border-border"}`}>
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{counts[e.id] || 0} pendaftar</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section 
        title={eventFilter ? "Daftar Calon Jamaah" : "Pendaftar Terbaru"}
        action={
          eventFilter && (
            <Button variant="ghost" size="sm" onClick={() => setEventFilter("")} className="h-8 text-xs gap-1">
              <X className="h-3 w-3" /> Tampilkan semua
            </Button>
          )
        }
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Menampilkan <span className="font-bold text-foreground">{filtered.length}</span> jamaah terdaftar
          </p>
        </div>

        {/* Desktop table view */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-border/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Tanggal Daftar</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3 text-center">Gender</th>
                <th className="px-4 py-3">Kota</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3">Pesan Doa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((r) => {
                const phone = r.profiles?.phone || "";
                return (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.profiles?.full_name || "—"}</td>
                    <td className="px-4 py-3">
                      {phone ? (
                        <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline">
                          <MessageCircle className="h-3.5 w-3.5" /> {phone}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">{r.profiles?.gender || "—"}</td>
                    <td className="px-4 py-3 text-xs">{r.profiles?.city || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{r.events?.title}</td>
                    <td className="px-4 py-3 text-xs text-right whitespace-nowrap font-medium">
                      {fmtRp(r.amount_paid)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px] truncate" title={r.donor_message || ""}>
                      {r.donor_message || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {filtered.map((r) => {
            const phone = r.profiles?.phone || "";
            return (
              <div key={r.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{r.profiles?.full_name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Daftar: {new Date(r.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground/40" />
                </div>
                {(r.amount_paid > 0 || r.donor_message) && (
                  <div className="space-y-1 rounded-lg bg-muted/40 px-2 py-1.5">
                    {r.amount_paid > 0 && (
                      <p className="text-xs font-semibold text-foreground">{fmtRp(r.amount_paid)}</p>
                    )}
                    {r.donor_message && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2">"{r.donor_message}"</p>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <div className="flex items-center gap-2">
                    {phone && (
                      <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">{r.events?.title}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed border-border/60">
            <p className="text-sm text-muted-foreground">Belum ada pendaftar</p>
          </div>
        )}
      </Section>
    </>
  );
}
