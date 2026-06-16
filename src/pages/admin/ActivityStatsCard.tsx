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

function buildWeekly(attendance: any[] = [], redemptions: any[] = []) {
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
  if (Array.isArray(attendance)) {
    for (const a of attendance) {
      if (!a || !a.scanned_at) continue;
      const i = idx.get(k(new Date(a.scanned_at))); if (i === undefined) continue;
      const g = a.profiles?.gender;
      if (g === "MALE" || g === "male" || g === "L") buckets[i].male++;
      else if (g === "FEMALE" || g === "female" || g === "P") buckets[i].female++;
    }
  }
  if (Array.isArray(redemptions)) {
    for (const r of redemptions) {
      if (!r || !r.created_at) continue;
      if (r.status !== "approved" && r.status !== "selesai" && r.status !== "completed") continue;
      const i = idx.get(k(new Date(r.created_at))); if (i !== undefined) buckets[i].reward++;
    }
  }
  return buckets;
}

function buildDaily(attendance: any[] = [], redemptions: any[] = []) {
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
  if (Array.isArray(attendance)) {
    for (const a of attendance) {
      if (!a || !a.scanned_at) continue;
      const d = new Date(a.scanned_at);
      const i = idx.get(k(d)); if (i === undefined) continue;
      const g = a.profiles?.gender;
      if (g === "MALE" || g === "male" || g === "L") buckets[i].male++;
      else if (g === "FEMALE" || g === "female" || g === "P") buckets[i].female++;
    }
  }
  if (Array.isArray(redemptions)) {
    for (const r of redemptions) {
      if (!r || !r.created_at) continue;
      if (r.status !== "approved" && r.status !== "selesai" && r.status !== "completed") continue;
      const d = new Date(r.created_at);
      const i = idx.get(k(d)); if (i !== undefined) buckets[i].reward++;
    }
  }
  return buckets;
}

/** Build per-program attendance ranking data (only counting who attended) */
function buildProgramRanking(attendance: any[] = [], events: any[] = [], programs: any[] = []) {
  if (!Array.isArray(attendance) || !Array.isArray(events) || !Array.isArray(programs)) return [];
  
  const counts: Record<string, { total: number }> = {};
  for (const p of programs) {
    if (p && p.id) counts[p.id] = { total: 0 };
  }
  // Count attendance by program (through events)
  for (const a of attendance) {
    if (!a || !a.event_id) continue;
    const event = events.find((e) => e && e.id === a.event_id);
    if (!event || !event.program_id) continue;
    const pid = event.program_id;
    if (!counts[pid]) counts[pid] = { total: 0 };
    counts[pid].total++;
  }
  return programs
    .filter(p => p && p.id)
    .map((p) => ({
      id: p.id,
      label: p.name?.length > 22 ? p.name.slice(0, 22) + "…" : (p.name ?? "—"),
      fullTitle: p.name ?? "—",
      code: p.code ?? "—",
      total: counts[p.id]?.total ?? 0,
    }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
}

export default function ActivityStatsCard({
  attendance, redemptions, registrations, logins, events, programs = [],
}: { attendance: any[]; redemptions: any[]; registrations: any[]; logins: any[]; events: any[]; programs?: any[] }) {
  const [kind, setKind] = useState<ChartKind>("bar");

  // ── Program filter state ──────────────────────────────────────────────
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [showProgramPicker, setShowProgramPicker] = useState(false);
  const [searchProgram, setSearchProgram] = useState("");

  // ── Event filter state ────────────────────────────────────────────────
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [searchEvent, setSearchEvent] = useState("");

  // Get events for selected program
  const eventsForProgram = useMemo(() => {
    if (!selectedProgramId) return events;
    return events.filter((e) => e.program_id === selectedProgramId);
  }, [events, selectedProgramId]);

  // Filter attendance & redemptions by selected program / event
  const filteredAttendance = useMemo(
    () => {
      if (!Array.isArray(attendance)) return [];
      const programFiltered = selectedProgramId
        ? attendance.filter((a) => a && eventsForProgram.some((e) => e && e.id === a.event_id))
        : attendance;
      if (!selectedEventId) return programFiltered;
      return programFiltered.filter((a) => a && a.event_id === selectedEventId);
    },
    [attendance, selectedProgramId, eventsForProgram, selectedEventId],
  );
  const filteredRedemptions = useMemo(
    () => {
      if (!Array.isArray(redemptions)) return [];
      return selectedProgramId ? [] : redemptions;
    },
    [redemptions, selectedProgramId],
  );

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find((e) => e && e.id === selectedEventId) ?? null;
  }, [events, selectedEventId]);
  const filteredRegistrations = useMemo(
    () => {
      if (!Array.isArray(registrations)) return [];
      const programFiltered = selectedProgramId
        ? registrations.filter((r) => r && eventsForProgram.some((e) => e && e.id === r.event_id))
        : registrations;
      if (!selectedEventId) return programFiltered;
      return programFiltered.filter((r) => r && r.event_id === selectedEventId);
    },
    [registrations, selectedProgramId, eventsForProgram, selectedEventId],
  );

  const filteredEvents = useMemo(() => {
    const list = selectedProgramId ? eventsForProgram : events;
    return Array.isArray(list) ? list : [];
  }, [events, eventsForProgram, selectedProgramId]);

  const visibleEvents = useMemo(() => {
    return filteredEvents.filter((e) => e?.title?.toLowerCase().includes(searchEvent.toLowerCase()));
  }, [filteredEvents, searchEvent]);

  const totalRegistrations = filteredRegistrations.length;
  const totalAttendance = filteredAttendance.length;
  const totalCollected = useMemo(() => {
    return filteredRegistrations.reduce((sum, r) => {
      const amount = Number(r?.amount_paid ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [filteredRegistrations]);

  const weekly = useMemo(() => buildWeekly(filteredAttendance, filteredRedemptions), [filteredAttendance, filteredRedemptions]);
  const daily = useMemo(() => buildDaily(filteredAttendance, filteredRedemptions), [filteredAttendance, filteredRedemptions]);
  const programRanking = useMemo(() => buildProgramRanking(attendance, events, programs), [attendance, events, programs]);

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

  // Donut for program ranking mode: top programs by total registrations
  const programDonutData = useMemo(
    () => programRanking.slice(0, 8).map((p, i) => ({
      name: p.label,
      value: p.total,
      fill: `hsl(${(i * 42) % 360}, 65%, 55%)`,
    })),
    [programRanking],
  );

  const tabs: { key: ChartKind; label: string; icon: any }[] = [
    { key: "bar", label: "Bar", icon: BarChart3 },
    { key: "donut", label: "Donut", icon: PieIcon },
    { key: "line", label: "Line", icon: LineIcon },
  ];

  // ── Program picker helpers ────────────────────────────────────────────
  const filteredPrograms = Array.isArray(programs) ? programs.filter((p) =>
    p && (p.name?.toLowerCase().includes(searchProgram.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchProgram.toLowerCase())),
  ) : [];
  const selectedProgram = (selectedProgramId && Array.isArray(programs)) ? programs.find((p) => p && p.id === selectedProgramId) : null;
  const isEventSelected = !!selectedEventId;

  // ── Chart data: if program selected → show per-program breakdown (weekly/daily)
  //               if no program → show ranking (bar/donut) or all-time line
  const isProgramSelected = !!selectedProgramId;

  // For "Semua Program" bar/donut: show program ranking
  const rankingBarData = programRanking.slice(0, 15);

  return (
    <div className="rounded-2xl bg-card p-4 sm:p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex flex-col gap-3 sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold">Statistik Aktivitas</h2>
          <p className="text-xs text-muted-foreground">
            {isProgramSelected
              ? `Program: ${selectedProgram?.name ?? "—"}`
              : "Ringkasan jamaah hadir & reward yang ditukar"}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="w-full flex justify-between rounded-xl bg-muted p-1 sm:w-auto sm:inline-flex sm:justify-normal">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = kind === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setKind(t.key)}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center sm:justify-normal gap-1.5 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition ${
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
              eventTitle: selectedEventId 
                ? selectedEvent?.title 
                : (selectedProgramId ? selectedProgram?.name : undefined),
              isEventFiltered: !!selectedEventId,
              isProgramFiltered: !!selectedProgramId,
            })}
            className="gap-1.5 text-[11px] sm:text-xs h-7 sm:h-8"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* ── Program & Event Pickers ────────────────────────────────────── */}
      <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="relative">
          <button
            onClick={() => setShowProgramPicker(!showProgramPicker)}
            className={`w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition ${
              isProgramSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <span className="truncate text-[11px] sm:text-xs">
              {isProgramSelected ? selectedProgram?.name : "Semua Program"}
            </span>
            <ChevronDown className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 transition ${showProgramPicker ? "rotate-180" : ""}`} />
          </button>
          {isProgramSelected && (
            <button
              onClick={() => { setSelectedProgramId(""); setSelectedEventId(""); setShowProgramPicker(false); }}
              className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted/60 p-0.5 text-muted-foreground hover:text-foreground transition"
              title="Reset ke Semua Program"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {showProgramPicker && (
            <div className="absolute left-0 top-full z-20 mt-1.5 w-full min-w-[16rem] rounded-2xl border border-border bg-card shadow-lg sm:w-96">
              <div className="p-3 border-b border-border/60">
                <Input
                  placeholder="Cari program..."
                  value={searchProgram}
                  onChange={(e) => setSearchProgram(e.target.value)}
                  className="h-8 text-xs"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                <button
                  onClick={() => { setSelectedProgramId(""); setSelectedEventId(""); setShowProgramPicker(false); setSearchProgram(""); }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                    !isProgramSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <span className="font-medium">Semua Program</span>
                  <span className="ml-1 text-muted-foreground">({attendance.length} peserta hadir)</span>
                </button>

                {filteredPrograms.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">Program tidak ditemukan</p>
                )}
                {filteredPrograms.map((p) => {
                  if (!p) return null;
                  const count = (Array.isArray(attendance) && Array.isArray(events)) ? attendance.filter((a) => {
                    if (!a) return false;
                    const event = events.find((e) => e && e.id === a.event_id);
                    return event?.program_id === p.id;
                  }).length : 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProgramId(p.id); setSelectedEventId(""); setShowProgramPicker(false); setSearchProgram(""); }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                        selectedProgramId === p.id
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium line-clamp-1">{p.name}</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        {p.code} · {count} hadir
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="relative w-full">
          <button
            onClick={() => {
              if (!showEventPicker) setSearchEvent("");
              setShowEventPicker(!showEventPicker);
            }}
            className={`w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition ${
              isEventSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <span className="truncate text-[11px] sm:text-xs">
              {isEventSelected ? selectedEvent?.title : "Semua Event"}
            </span>
            <ChevronDown className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 transition ${showEventPicker ? "rotate-180" : ""}`} />
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
            <div className="absolute left-0 top-full z-20 mt-1.5 w-full min-w-[18rem] rounded-2xl border border-border bg-card shadow-lg sm:w-80">
              <div className="p-3 border-b border-border/60">
                <Input
                  placeholder="Cari event..."
                  value={searchEvent}
                  onChange={(e) => setSearchEvent(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                <button
                  onClick={() => { setSelectedEventId(""); setShowEventPicker(false); setSearchEvent(""); }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                    !isEventSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <span className="font-medium">Semua Event</span>
                  <span className="ml-1 text-muted-foreground">({filteredEvents.length} event)</span>
                </button>

                {visibleEvents.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">Event tidak ditemukan</p>
                )}
                {visibleEvents.map((e) => {
                  if (!e) return null;
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
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        {e.programs?.code || "—"} · {attendance.filter((a) => a?.event_id === e.id).length} hadir
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <StatCard label="Total Pendaftar" value={totalRegistrations} />
        <StatCard label="Total Kehadiran" value={totalAttendance} />
        <StatCard label="Total Nominal Terkumpul" value={totalCollected} isCurrency />
      </div>

      {/* ── Legend totals ─────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {isProgramSelected ? (
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
          {/* ── SEMUA PROGRAM: Bar weekly (batang berdiri, Laki-laki + Perempuan + Reward) ── */}
          {!isProgramSelected && kind === "bar" ? (
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
          ) : !isProgramSelected && kind === "donut" ? (
            /* ── SEMUA PROGRAM: Donut ranking ─────────────────────────── */
            <PieChart>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Pie data={programDonutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {programDonutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
            </PieChart>
          ) : !isProgramSelected && kind === "line" ? (
            /* ── SEMUA PROGRAM: Line (weekly) ─────────────────────────── */
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
          ) : isProgramSelected && kind === "bar" ? (
            /* ── PROGRAM TERPILIH: Bar weekly ─────────────────────────── */
            <BarChart data={weekly} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="male" name="Laki-laki" fill={COLORS.male} radius={[6, 6, 0, 0]} />
              <Bar dataKey="female" name="Perempuan" fill={COLORS.female} radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : isProgramSelected && kind === "donut" ? (
            /* ── PROGRAM TERPILIH: Donut gender breakdown ─────────────── */
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
            /* ── PROGRAM TERPILIH: Line daily ─────────────────────────── */
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

      {/* ── Program ranking note ────────────────────────────────────────── */}
      {!isProgramSelected && kind === "bar" && rankingBarData.length > 0 && (
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Menampilkan {rankingBarData.length} program teratas berdasarkan jumlah peserta yang hadir
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, isCurrency = false }: { label: string; value: number; isCurrency?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">
        {isCurrency ? `Rp ${value.toLocaleString("id-ID")}` : value.toLocaleString("id-ID")}
      </p>
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
