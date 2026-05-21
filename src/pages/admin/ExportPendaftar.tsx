import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Download, FileSpreadsheet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Section } from "./components";
import { useAdmin } from "./AdminLayout";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type Row = {
  id: string;
  created_at: string;
  event_id: string;
  user_id: string;
  events: { title: string; programs?: { name: string } | null } | null;
  profiles: { full_name?: string; phone?: string; gender?: string; city?: string; email?: string } | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export default function ExportPendaftarPage() {
  const { events } = useAdmin();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState<string>(daysAgo(30));
  const [to, setTo] = useState<string>(todayISO());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const selectAll = () => setSelected(new Set(events.map((e) => e.id)));
  const clearAll = () => setSelected(new Set());

  const fetchData = async () => {
    if (selected.size === 0) { setRows([]); return; }
    setLoading(true);
    const start = new Date(from + "T00:00:00").toISOString();
    const end = new Date(to + "T23:59:59").toISOString();
    const { data, error } = await supabase
      .from("registrations")
      .select("id, created_at, event_id, user_id, events(title, programs(name)), profiles:user_id(full_name, phone, gender, city, email)")
      .in("event_id", Array.from(selected))
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false })
      .limit(5000);
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as any);
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [selected, from, to]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    rows.forEach((r) => {
      const arr = map.get(r.event_id) ?? [];
      arr.push(r);
      map.set(r.event_id, arr);
    });
    return map;
  }, [rows]);

  const download = () => {
    if (rows.length === 0) return toast.error("Tidak ada data untuk diunduh");
    const wb = XLSX.utils.book_new();
    const sheetCols = [
      { wch: 5 }, { wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 22 },
    ];

    // Sheet ringkasan
    const summary = Array.from(grouped.entries()).map(([eid, list], i) => {
      const ev = events.find((e) => e.id === eid);
      return {
        No: i + 1,
        Event: ev?.title ?? "-",
        Program: ev?.programs?.name ?? "-",
        "Jumlah Pendaftar": list.length,
      };
    });
    const ws0 = XLSX.utils.json_to_sheet(summary);
    ws0["!cols"] = [{ wch: 5 }, { wch: 40 }, { wch: 24 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws0, "Ringkasan");

    // Satu sheet per event
    const usedNames = new Set<string>();
    Array.from(grouped.entries()).forEach(([eid, list]) => {
      const ev = events.find((e) => e.id === eid);
      let name = (ev?.title || "Event").replace(/[\\/?*[\]:]/g, "").slice(0, 28) || "Event";
      let n = name, i = 2;
      while (usedNames.has(n)) { n = `${name.slice(0, 26)}_${i++}`; }
      usedNames.add(n);
      const data = list.map((r, i) => ({
        No: i + 1,
        "Tanggal Daftar": new Date(r.created_at).toLocaleString("id-ID"),
        Nama: r.profiles?.full_name ?? "-",
        WhatsApp: r.profiles?.phone ?? "-",
        Gender: r.profiles?.gender === "L" ? "Laki-laki" : r.profiles?.gender === "P" ? "Perempuan" : "-",
        Kota: r.profiles?.city ?? "-",
        Email: r.profiles?.email ?? "-",
        Program: r.events?.programs?.name ?? "-",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = sheetCols;
      XLSX.utils.book_append_sheet(wb, ws, n);
    });

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `pendaftar-${stamp}.xlsx`);
  };

  const preview = rows.slice(0, 50);

  return (
    <>
      <div>
        <Link to="/admin/pendaftar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Kembali ke Pendaftar
        </Link>
        <h1 className="font-display text-3xl font-bold mt-2">Download Data Pendaftar</h1>
        <p className="text-sm text-muted-foreground">Pilih event & rentang tanggal, lalu unduh Excel rapi (satu sheet per event).</p>
      </div>

      <Section title="Pilih Event">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={selectAll}>Pilih semua</Button>
          <Button size="sm" variant="outline" onClick={clearAll}>Kosongkan</Button>
          <span className="text-xs text-muted-foreground self-center">{selected.size} event dipilih</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {events.map((e) => {
            const active = selected.has(e.id);
            return (
              <button key={e.id} type="button" onClick={() => toggle(e.id)}
                className={`flex items-start gap-2 rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "border-border/60"}`}>
                <span className={`mt-0.5 grid h-4 w-4 place-items-center rounded border ${active ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                  {active && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.programs?.name || "—"} · {e.is_recurring ? "Berkelanjutan" : new Date(e.starts_at).toLocaleDateString("id-ID")}</p>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Rentang Tanggal Pendaftaran">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Dari Tanggal</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Sampai Tanggal</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["Hari Ini", 0], ["7 Hari", 7], ["30 Hari", 30], ["90 Hari", 90], ["Tahun Ini", 365],
          ].map(([label, n]) => (
            <button key={label as string} type="button" onClick={() => { setFrom(daysAgo(n as number)); setTo(todayISO()); }}
              className="rounded-full bg-muted px-3 py-1 text-xs hover:bg-muted/70">{label}</button>
          ))}
        </div>
        <div className="mt-4">
          <Button onClick={download} disabled={rows.length === 0} className="bg-primary text-primary-foreground">
            <Download className="mr-2 h-4 w-4" /> Download Excel ({rows.length} data)
          </Button>
        </div>
      </Section>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border/60 p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Jumlah Pendaftar</p><p className="mt-1 text-2xl font-bold">{rows.length}</p></div>
        <div className="rounded-xl border border-border/60 p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Event Dipilih</p><p className="mt-1 text-2xl font-bold text-primary">{selected.size}</p></div>
        <div className="rounded-xl border border-border/60 p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Periode</p><p className="mt-1 text-sm font-semibold">{from} – {to}</p></div>
      </div>

      <Section title={<span className="inline-flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Preview Data {loading && <span className="text-xs text-muted-foreground">(memuat…)</span>}</span> as any}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Tanggal</th><th>Nama</th><th>WhatsApp</th><th>Event</th><th>Program</th></tr>
            </thead>
            <tbody>
              {preview.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-2">{new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="font-medium">{r.profiles?.full_name || "—"}</td>
                  <td>{r.profiles?.phone || "—"}</td>
                  <td className="text-xs">{r.events?.title}</td>
                  <td className="text-xs">{r.events?.programs?.name || "—"}</td>
                </tr>
              ))}
              {preview.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-sm">Pilih event untuk melihat preview.</td></tr>
              )}
            </tbody>
          </table>
          {rows.length > preview.length && (
            <p className="mt-2 text-xs text-muted-foreground">Menampilkan {preview.length} dari {rows.length}. Unduh Excel untuk data lengkap.</p>
          )}
        </div>
      </Section>
    </>
  );
}