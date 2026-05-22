import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon, Download, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportStatsXLSX } from "./exportStats";

type ChartKind = "bar" | "donut" | "line";

const COLORS = {
  male: "hsl(var(--chart-male))",
  female: "hsl(var(--chart-female))",
  reward: "hsl(var(--chart-reward))",
};

// Get Monday-based week start
function weekStart(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  return x;
}
const fmtDM = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

function buildWeekly(attendance: any[], redemptions: any[]) {
  const now = new Date();
  const thisWeek = weekStart(now);
  const buckets: { key: string; label: string; male: number; female: number; reward: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const ws = new Date(thisWeek); ws.setDate(ws.getDate() - i * 7);
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    buckets.push({
      key: `${ws.getFullYear()}-${ws.getMonth()}-${ws.getDate()}`,
      label: `${fmtDM(ws)}–${fmtDM(we)}`,
      male: 0, female: 0, reward: 0,
    });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  const k = (d: Date) => { const w = weekStart(d); return `${w.getFullYear()}-${w.getMonth()}-${w.getDate()}`; };
  for (const a of attendance) {
    const i = idx.get(k(new Date(a.scanned_at))); if (i === undefined) continue;
    const g = a.profiles?.gender;
    if (g === "MALE" || g === "male" || g === "L") buckets[i].male++;
    else if (g === "FEMALE" || g === "female" || g === "P") buckets[i].female++;
  }
  for (const r of redemptions) {
    if (r.status !== "approved" && r.status !== "selesai" && r.status !== "completed") continue;
    const i = idx.get(k(new Date(r.created_at))); if (i !== undefined) buckets[i].reward++;
  }
  return buckets;
}

function buildDaily(attendance: any[], redemptions: any[]) {
  const now = new Date();
  const buckets: { key: string; label: string; male: number; female: number; reward: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      male: 0, female: 0, reward: 0,
    });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  const k = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  for (const a of attendance) {
    const d = new Date(a.scanned_at);
    const i = idx.get(k(d)); if (i === undefined) continue;
    const g = a.profiles?.gender;
    if (g === "MALE" || g === "male" || g === "L") buckets[i].male++;
    else if (g === "FEMALE" || g === "female" || g === "P") buckets[i].female++;
  }
  for (const r of redemptions) {
    if (r.status !== "approved" && r.status !== "selesai" && r.status !== "completed") continue;
    const d = new Date(r.created_at);
    const i = idx.get(k(d)); if (i !== undefined) buckets[i].reward++;
  }
  return buckets;
}

/** Build per-event attendance ranking data */
function buildEventRanking(attendance: any[], events: any[]) {
  const counts: Record<string, { male: number; female: number; total: number }> = {};
  for (const a of attendance) {
    const eid = a.event_id;
    if (!eid) continue;
    if (!counts[eid]) counts[eid] = { male: 0, female: 0, total: 0 };
    const g = a.profiles?.gender;
    if (g === "MALE" || g === "male" || g === "L") { counts[eid].male++; counts[eid].total++; }
    else if (g === "FEMALE" || g === "female" || g === "P") { counts[eid].female++; counts[eid].total++; }
    else counts[eid].total++;
  }
  return events
    .map((e) => ({
      id: e.id,
      label: e.title?.length > 22 ? e.title.slice(0, 22) + "…" : (e.title ?? "—"),
      fullTitle: e.title ?? "—",
      male: counts[e.id]?.male ?? 0,
      female: counts[e.id]?.female ?? 0,
      total: counts[e.id]?.total ?? 0,
    }))
    .filter((e) => e.total > 0)
    .sort((a, b) => b.total - a.total);
}

export default function ActivityStatsCard({
  attendance, redemptions, registrations, logins, events,
}: { attendance: any[]; redemptions: any[]; registrations: any[]; logins: any[]; events: any[] }) {
  const [kind, setKind] = useState<ChartKind>("bar");

  // ── Event filter state ──────────────────────────────────────────────
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [searchEvent, setSearchEvent] = useState("");

  // Filter attendance & redemptions by selected event
  const filteredAttendance = useMemo(
    () => selectedEventId ? attendance.filter((a) => a.event_id === selectedEventId) : attendance,
    [attendance, selectedEventId],
  );
  const filteredRedemptions = useMemo(
    () => selectedEventId ? [] : redemptions, // redemptions have no event_id
    [redemptions, selectedEventId],
  );
  const filteredRegistrations = useMemo(
    () => selectedEventId ? registrations.filter((r) => r.event_id === selectedEventId) : registrations,
    [registrations, selectedEventId],
  );

  const weekly = useMemo(() => buildWeekly(filteredAttendance, filteredRedemptions), [filteredAttendance, filteredRedemptions]);
  const daily = useMemo(() => buildDaily(filteredAttendance, filteredRedemptions), [filteredAttendance, filteredRedemptions]);
  const eventRanking = useMemo(() => buildEventRanking(attendance, events), [attendance, events]);

  const totals = useMemo(() => {
    const t = { male: 0, female: 0, reward: 0 };
    for (const b of weekly) { t.male += b.male; t.female += b.female; t.reward += b.reward; }
    return t;
  }, [weekly]);

  const donutData = [
    { name: "Laki-laki", value: totals.male, fill: COLORS.male },
    { name: "Perempuan", value: totals.female, fill: COLORS.female },
    { name: "Reward", value: totals.reward, fill: COLORS.reward },
  ];

  // Donut for event ranking mode: top events by total
  const eventDonutData = useMemo(
    () => eventRanking.slice(0, 8).map((e, i) => ({
      name: e.label,
      value: e.total,
      fill: `hsl(${(i * 42) % 360}, 65%, 55%)`,
    })),
    [eventRanking],
  );

  const tabs: { key: ChartKind; label: string; icon: any }[] = [
    { key: "bar", label: "Bar", icon: BarChart3 },
    { key: "donut", label: "Donut", icon: PieIcon },
    { key: "line", label: "Line", icon: LineIcon },
  ];

  // ── Event picker helpers ────────────────────────────────────────────
  const activeEvents = events.filter((e) => e.status === "active");
  const pastEvents = events.filter((e) => e.status !== "active");
  const filteredEvents = [...activeEvents, ...pastEvents].filter((e) =>
    e.title?.toLowerCase().includes(searchEvent.toLowerCase()),
  );
  const selectedEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) : null;

  // ── Chart data: if event selected → show per-event breakdown (weekly/daily)
  //               if no event → show ranking (bar/donut) or all-time line
  const isEventSelected = !!selectedEventId;

  // For "Semua Event" bar/donut: show event ranking
  const rankingBarData = eventRanking.slice(0, 15);

  return (
    <div className="rounded-2xl bg-card p-4 sm:p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex flex-col gap-3 sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold">Statistik Aktivitas</h2>
          <p className="text-xs text-muted-foreground">
            {isEventSelected
              ? `Event: ${selectedEvent?.title ?? "—"}`
              : "Ringkasan jamaah hadir & reward yang ditukar"}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="inline-flex rounded-xl bg-muted p-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = kind === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setKind(t.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition ${
                    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t.label}
                </button>
              );
            })}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportStatsXLSX({
              attendance: filteredAttendance,
              redemptions: filteredRedemptions,
              registrations: filteredRegistrations,
              logins,
              weekly,
              daily,
              totals,
              eventTitle: selectedEvent?.title,
            })}
            className="gap-1.5 text-[11px] sm:text-xs h-7 sm:h-8"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* ── Event Picker ──────────────────────────────────────────────── */}
      <div className="mt-3 sm:mt-4">
        <div className="relative">
          <button
            onClick={() => setShowEventPicker(!showEventPicker)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              isEventSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <span className="max-w-[180px] truncate">
              {isEventSelected ? selectedEvent?.title : "Semua Event"}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition ${showEventPicker ? "rotate-180" : ""}`} />
          </button>
          {isEventSelected && (
            <button
              onClick={() => { setSelectedEventId(""); setShowEventPicker(false); }}
              className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted/60 p-0.5 text-muted-foreground hover:text-foreground transition"
              title="Reset ke Semua Event"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {showEventPicker && (
            <div className="absolute left-0 top-full z-20 mt-1.5 w-72 sm:w-80 rounded-2xl border border-border bg-card shadow-lg">
              <div className="p-3 border-b border-border/60">
                <Input
                  placeholder="Cari event..."
                  value={searchEvent}
                  onChange={(e) => setSearchEvent(e.target.value)}
                  className="h-8 text-xs"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                {/* Semua Event option */}
                <button
                  onClick={() => { setSelectedEventId(""); setShowEventPicker(false); setSearchEvent(""); }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                    !isEventSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <span className="font-medium">Semua Event</span>
                  <span className="ml-1 text-muted-foreground">({attendance.length} hadir)</span>
                </button>

                {/* Filtered events */}
                {filteredEvents.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">Event tidak ditemukan</p>
                )}
                {filteredEvents.map((e) => {
                  const count = attendance.filter((a) => a.event_id === e.id).length;
                  const isActive = e.status === "active";
                  return (
                    <button
                      key={e.id}
                      onClick={() => { setSelectedEventId(e.id); setShowEventPicker(false); setSearchEvent(""); }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                        selectedEventId === e.id
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium line-clamp-1">{e.title}</span>
                        {isActive && (
                          <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent">Aktif</span>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        {e.programs?.name || "—"} · {count} hadir
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend totals ─────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
        {isEventSelected ? (
          <>
            <Legendy color={COLORS.male} label="Laki-laki" value={totals.male} />
            <Legendy color={COLORS.female} label="Perempuan" value={totals.female} />
          </>
        ) : (
          <>
            <Legendy color={COLORS.male} label="Laki-laki" value={totals.male} />
            <Legendy color={COLORS.female} label="Perempuan" value={totals.female} />
            <Legendy color={COLORS.reward} label="Reward" value={totals.reward} />
          </>
        )}
      </div>

      {/* ── Chart area ────────────────────────────────────────────────── */}
      <div className="mt-4 h-56 sm:h-64 md:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {/* ── SEMUA EVENT: Bar weekly (batang berdiri, Laki-laki + Perempuan + Reward) ── */}
          {!isEventSelected && kind === "bar" ? (
            <BarChart data={weekly} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="male" name="Laki-laki" fill={COLORS.male} radius={[6, 6, 0, 0]} />
              <Bar dataKey="female" name="Perempuan" fill={COLORS.female} radius={[6, 6, 0, 0]} />
              <Bar dataKey="reward" name="Reward" fill={COLORS.reward} radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : !isEventSelected && kind === "donut" ? (
            /* ── SEMUA EVENT: Donut ranking ─────────────────────────── */
            <PieChart>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Pie data={eventDonutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {eventDonutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
            </PieChart>
          ) : !isEventSelected && kind === "line" ? (
            /* ── SEMUA EVENT: Line (weekly) ─────────────────────────── */
            <LineChart data={weekly} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="male" name="Laki-laki" stroke={COLORS.male} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="female" name="Perempuan" stroke={COLORS.female} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="reward" name="Reward" stroke={COLORS.reward} strokeWidth={2.5} dot={false} />
            </LineChart>
          ) : isEventSelected && kind === "bar" ? (
            /* ── EVENT TERPILIH: Bar weekly ─────────────────────────── */
            <BarChart data={weekly} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="male" name="Laki-laki" fill={COLORS.male} radius={[6, 6, 0, 0]} />
              <Bar dataKey="female" name="Perempuan" fill={COLORS.female} radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : isEventSelected && kind === "donut" ? (
            /* ── EVENT TERPILIH: Donut gender breakdown ─────────────── */
            <PieChart>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={[
                  { name: "Laki-laki", value: totals.male, fill: COLORS.male },
                  { name: "Perempuan", value: totals.female, fill: COLORS.female },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {[COLORS.male, COLORS.female].map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
            </PieChart>
          ) : (
            /* ── EVENT TERPILIH: Line daily ─────────────────────────── */
            <LineChart data={daily} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="male" name="Laki-laki" stroke={COLORS.male} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="female" name="Perempuan" stroke={COLORS.female} strokeWidth={2.5} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ── Event ranking note ────────────────────────────────────────── */}
      {!isEventSelected && kind === "bar" && rankingBarData.length > 0 && (
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Menampilkan {rankingBarData.length} event teratas berdasarkan jumlah kehadiran
        </p>
      )}
    </div>
  );
}

function Legendy({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-muted/50 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs">
      <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}
