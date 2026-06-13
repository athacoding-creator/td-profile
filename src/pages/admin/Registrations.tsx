import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";
import { MessageCircle, Download, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import { isEventExpired } from "@/lib/eventSchedule";

export default function RegistrationsPage() {
  const { events, attendance, registrations } = useAdmin();
  const [eventFilter, setEventFilter] = useState<string>("");
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [searchPast, setSearchPast] = useState("");

  // Lookup: event_id|user_id -> { amount_paid, donor_message }
  const regLookup = useMemo(() => {
    const m: Record<string, { amount_paid: number | null; donor_message: string | null }> = {};
    registrations.forEach((r: any) => {
      m[`${r.event_id}|${r.user_id}`] = {
        amount_paid: r.amount_paid ?? null,
        donor_message: r.donor_message ?? null,
      };
    });
    return m;
  }, [registrations]);

  const getReg = (a: any) => regLookup[`${a.event_id}|${a.user_id}`] || { amount_paid: null, donor_message: null };
  const fmtRp = (n: number | null | undefined) =>
    n && n > 0 ? `Rp ${Number(n).toLocaleString("id-ID")}` : "—";

  // Hanya tampilkan jamaah yang sudah scan QR (tercatat di attendance)
  const filtered = eventFilter
    ? attendance.filter((a) => a.event_id === eventFilter)
    : attendance;

  // Hitung jumlah hadir per event
  const counts: Record<string, number> = {};
  attendance.forEach((a) => {
    if (a.event_id) counts[a.event_id] = (counts[a.event_id] || 0) + 1;
  });

  const activeEvents = events.filter((e) => e.status === "active" && !isEventExpired(e));
  const pastEvents = events.filter((e) => e.status !== "active" || isEventExpired(e));
  const filteredPastEvents = pastEvents.filter((e) =>
    e.title?.toLowerCase().includes(searchPast.toLowerCase())
  );

  const exportXLSX = () => {
    const ev = eventFilter ? events.find((e) => e.id === eventFilter) : null;
    const rows = filtered.map((a, i) => {
      const reg = getReg(a);
      return ({
      No: i + 1,
      "Waktu Hadir": new Date(a.scanned_at).toLocaleString("id-ID"),
      Nama: a.profiles?.full_name ?? "-",
      WhatsApp: a.profiles?.phone ?? "-",
      Gender:
        a.profiles?.gender === "L"
          ? "Laki-laki"
          : a.profiles?.gender === "P"
          ? "Perempuan"
          : (a.profiles?.gender ?? "-"),
      Kota: a.profiles?.city ?? "-",
      Email: a.profiles?.email ?? "-",
      Event: ev?.title ?? (eventFilter ? "-" : "Semua Event"),
      "Poin Diperoleh": a.points_awarded ?? 0,
      Nominal: reg.amount_paid && reg.amount_paid > 0 ? Number(reg.amount_paid) : 0,
      "Pesan Doa": reg.donor_message ?? "",
    });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 }, { wch: 22 }, { wch: 28 }, { wch: 16 },
      { wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 36 }, { wch: 14 },
      { wch: 14 }, { wch: 40 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kehadiran");
    const slug = (ev?.title || "semua-event")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `kehadiran-${slug}-${stamp}.xlsx`);
  };

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Kehadiran</h1>
        <p className="text-sm text-muted-foreground">
          Jamaah yang benar-benar hadir (sudah scan QR)
        </p>
      </div>

      <Section title="Jamaah per Event">
        <div className="space-y-3">
          {activeEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Event Aktif</p>
              <div className="grid gap-2 sm:gap-2.5 grid-cols-1 sm:grid-cols-2">
                {activeEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setEventFilter(eventFilter === e.id ? "" : e.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      eventFilter === e.id
                        ? "border-primary bg-primary/5"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    <p className="font-medium text-sm">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.programs?.name || "—"} · {counts[e.id] || 0} hadir
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/40 bg-muted/30 p-3">
              <button
                onClick={() => setShowPastEvents(!showPastEvents)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition"
              >
                <ChevronDown
                  className={`h-4 w-4 transition ${showPastEvents ? "rotate-180" : ""}`}
                />
                Event Selesai ({pastEvents.length})
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
                      <button
                        key={e.id}
                        onClick={() => {
                          setEventFilter(eventFilter === e.id ? "" : e.id);
                          setShowPastEvents(false);
                        }}
                        className={`rounded-lg border p-3 text-left transition text-sm ${
                          eventFilter === e.id
                            ? "border-primary bg-primary/5"
                            : "border-border/60 hover:border-border"
                        }`}
                      >
                        <p className="font-medium">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.programs?.name || "—"} · {counts[e.id] || 0} hadir
                        </p>
                      </button>
                    ))}
                  </div>
                  {filteredPastEvents.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Event tidak ditemukan
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section
        title={
          eventFilter
            ? `Jamaah hadir — ${events.find((e) => e.id === eventFilter)?.title ?? "event terpilih"}`
            : "Semua jamaah hadir terbaru"
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={exportXLSX} disabled={filtered.length === 0}>
            <Download className="mr-1 h-4 w-4" /> Download Excel ({filtered.length})
          </Button>
          {eventFilter && (
            <button
              onClick={() => setEventFilter("")}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Tampilkan semua
            </button>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Waktu Hadir</th>
                <th className="pr-3">Nama</th>
                <th className="pr-3">WhatsApp</th>
                <th className="pr-3">Gender</th>
                <th className="pr-3">Kota</th>
                <th className="pr-3 text-right">Nominal</th>
                <th className="pr-3">Pesan Doa</th>
                <th>Poin</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const phone = a.profiles?.phone || "";
                const reg = getReg(a);
                return (
                  <tr key={a.id} className="border-t border-border/60">
                    <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(a.scanned_at).toLocaleString("id-ID")}
                    </td>
                    <td className="pr-3">{a.profiles?.full_name || "—"}</td>
                    <td className="pr-3">
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
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="pr-3">
                      {a.profiles?.gender === "L"
                        ? "Laki-laki"
                        : a.profiles?.gender === "P"
                        ? "Perempuan"
                        : (a.profiles?.gender || "—")}
                    </td>
                    <td className="pr-3">{a.profiles?.city || "—"}</td>
                    <td className="pr-3 text-xs text-right whitespace-nowrap font-medium">
                      {fmtRp(reg.amount_paid)}
                    </td>
                    <td className="pr-3 text-xs text-muted-foreground max-w-[220px] truncate" title={reg.donor_message || ""}>
                      {reg.donor_message || "—"}
                    </td>
                    <td className="text-xs font-medium">{a.points_awarded ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {filtered.map((a) => {
            const phone = a.profiles?.phone || "";
            const reg = getReg(a);
            return (
              <div
                key={a.id}
                className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm truncate">
                    {a.profiles?.full_name || "—"}
                  </p>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    +{a.points_awarded ?? 0} poin
                  </span>
                </div>
                {phone ? (
                  <a
                    href={`https://wa.me/${phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <MessageCircle className="h-3 w-3" />
                    {phone}
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
                {(reg.amount_paid && reg.amount_paid > 0) || reg.donor_message ? (
                  <div className="rounded-md bg-muted/60 px-2 py-1.5 space-y-0.5">
                    {reg.amount_paid && reg.amount_paid > 0 && (
                      <p className="text-xs font-semibold">{fmtRp(reg.amount_paid)}</p>
                    )}
                    {reg.donor_message && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2">"{reg.donor_message}"</p>
                    )}
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {new Date(a.scanned_at).toLocaleString("id-ID")}
                </p>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {eventFilter
                ? "Belum ada jamaah yang hadir di event ini"
                : "Belum ada data kehadiran"}
            </p>
          </div>
        )}
      </Section>
    </>
  );
}
