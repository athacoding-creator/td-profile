import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";
import { MessageCircle, Download, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";

export default function RegistrationsPage() {
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
    e.title.toLowerCase().includes(searchPast.toLowerCase())
  );

  const exportXLSX = () => {
    const ev = eventFilter ? events.find((e) => e.id === eventFilter) : null;
    const rows = filtered.map((r, i) => ({
      No: i + 1,
      "Tanggal Daftar": new Date(r.created_at).toLocaleString("id-ID"),
      Nama: r.profiles?.full_name ?? "-",
      WhatsApp: r.profiles?.phone ?? "-",
      Gender: r.profiles?.gender === "L" ? "Laki-laki" : r.profiles?.gender === "P" ? "Perempuan" : (r.profiles?.gender ?? "-"),
      Kota: r.profiles?.city ?? "-",
      Email: r.profiles?.email ?? "-",
      Event: r.events?.title ?? "-",
      Program: r.events?.programs?.name ?? "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 5 }, { wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 36 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pendaftar");
    const slug = (ev?.title || "semua-event").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `pendaftar-${slug}-${stamp}.xlsx`);
  };

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Pendaftar</h1>
        <p className="text-sm text-muted-foreground">Tracking jamaah per event</p>
      </div>
      <Section title="Jamaah per Event">
        <div className="space-y-3">

          {activeEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Event Aktif</p>
              <div className="grid gap-2 sm:gap-2.5 grid-cols-1 sm:grid-cols-2">
                {activeEvents.map((e) => (
                  <button key={e.id} onClick={() => setEventFilter(e.id)}
                    className={`rounded-xl border p-3 text-left transition ${eventFilter === e.id ? "border-primary bg-primary/5" : "border-border/60"}`}>
                    <p className="font-medium text-sm">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.programs?.name || "—"} · {counts[e.id] || 0} pendaftar</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/40 bg-muted/30 p-3">
              <button onClick={() => setShowPastEvents(!showPastEvents)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition">
                <ChevronDown className={`h-4 w-4 transition ${showPastEvents ? "rotate-180" : ""}`} />
                Total Event ({pastEvents.length})
              </button>

              {showPastEvents && (
                <div className="space-y-3 pt-2">
                  <Input
                    placeholder="Cari event..."
                    value={searchPast}
                    onChange={(e) => setSearchPast(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="grid gap-2 sm:gap-2.5 grid-cols-1 sm:grid-cols-2 max-h-64 overflow-y-auto">
                    {filteredPastEvents.map((e) => (
                      <button key={e.id} onClick={() => { setEventFilter(e.id); setShowPastEvents(false); }}
                        className={`rounded-lg border p-3 text-left transition text-sm ${eventFilter === e.id ? "border-primary bg-primary/5" : "border-border/60 hover:border-border"}`}>
                        <p className="font-medium">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{e.programs?.name || "—"} · {counts[e.id] || 0} pendaftar</p>
                      </button>
                    ))}
                  </div>
                  {filteredPastEvents.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Event tidak ditemukan</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title={eventFilter ? "Pendaftar event terpilih" : "Semua pendaftar terbaru"}>
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={exportXLSX} disabled={filtered.length === 0}>
            <Download className="mr-1 h-4 w-4" /> Download Excel ({filtered.length})
          </Button>
        </div>
        {/* Desktop table view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Tanggal</th><th>Nama</th><th>WhatsApp</th><th>Gender</th><th>Kota</th><th>Event</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const phone = r.profiles?.phone || "";
                return (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="py-2">{new Date(r.created_at).toLocaleString("id-ID")}</td>
                    <td>{r.profiles?.full_name || "—"}</td>
                    <td>
                      {phone ? (
                        <a
                          href={`https://wa.me/${phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {phone}
                        </a>
                      ) : "—"}
                    </td>
                    <td>{r.profiles?.gender || "—"}</td>
                    <td>{r.profiles?.city || "—"}</td>
                    <td className="text-xs">{r.events?.title}</td>
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
              <div key={r.id} className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{r.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{phone || "—"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {r.events?.title && <p className="text-xs text-muted-foreground">Event: {r.events.title}</p>}
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Tidak ada pendaftar</p>
          </div>
        )}
      </Section>
    </>
  );
}
