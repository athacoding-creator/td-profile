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

/** Build per-program registration ranking data */
function buildProgramRanking(registrations: any[], programs: any[]) {
  const counts: Record<string, { total: number }> = {};
  for (const p of programs) {
    counts[p.id] = { total: 0 };
  }
  for (const reg of registrations) {
    const event = reg.events;
    if (!event || !event.program_id) continue;
    const pid = event.program_id;
    if (!counts[pid]) counts[pid] = { total: 0 };
    counts[pid].total++;
  }
  return programs
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

  // Get events for selected program
  const eventsForProgram = useMemo(() => {
    if (!selectedProgramId) return events;
    return events.filter((e) => e.program_id === selectedProgramId);
  }, [events, selectedProgramId]);

  // Filter attendance & redemptions by selected program
  const filteredAttendance = useMemo(
    () => selectedProgramId 
      ? attendance.filter((a) => eventsForProgram.some((e) => e.id === a.event_id))
      : attendance,
    [attendance, selectedProgramId, eventsForProgram],
  );
  const filteredRedemptions = useMemo(
    () => selectedProgramId ? [] : redemptions, // redemptions have no program_id
    [redemptions, selectedProgramId],
  );
  const filteredRegistrations = useMemo(
    () => selectedProgramId
      ? registrations.filter((r) => eventsForProgram.some((e) => e.id === r.event_id))
      : registrations,
    [registrations, selectedProgramId, eventsForProgram],
  );

  const weekly = useMemo(() => buildWeekly(filteredAttendance, filteredRedemptions), [filteredAttendance, filteredRedemptions]);
  const daily = useMemo(() => buildDaily(filteredAttendance, filteredRedemptions), [filteredAttendance, filteredRedemptions]);
  const programRanking = useMemo(() => buildProgramRanking(registrations, programs), [registrations, programs]);

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
  const filteredPrograms = programs.filter((p) =>
    p.name?.toLowerCase().includes(searchProgram.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchProgram.toLowerCase()),
  );
  const selectedProgram = selectedProgramId ? programs.find((p) => p.id === selectedProgramId) : null;

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
              eventTitle: selectedProgram?.name,
            })}
            className="gap-1.5 text-[11px] sm:text-xs h-7 sm:h-8"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* ── Program Picker ──────────────────────────────────────────────── */}
      <div className="mt-3 sm:mt-4">
        <div className="relative">
          <button
            onClick={() => setShowProgramPicker(!showProgramPicker)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              isProgramSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <span className="max-w-[180px] truncate">
              {isProgramSelected ? selectedProgram?.name : "Semua Program"}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition ${showProgramPicker ? "rotate-180" : ""}`} />
          </button>
          {isProgramSelected && (
            <button
              onClick={() => { setSelectedProgramId(""); setShowProgramPicker(false); }}
              className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted/60 p-0.5 text-muted-foreground hover:text-foreground transition"
              title="Reset ke Semua Program"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {showProgramPicker && (
            <div className="absolute left-0 top-full z-20 mt-1.5 w-72 sm:w-80 rounded-2xl border border-border bg-card shadow-lg">
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
                {/* Semua Program option */}
                <button
                  onClick={() => { setSelectedProgramId(""); setShowProgramPicker(false); setSearchProgram(""); }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                    !isProgramSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <span className="font-medium">Semua Program</span>
                  <span className="ml-1 text-muted-foreground">({registrations.length} daftar)</span>
                </button>

                {/* Filtered programs */}
                {filteredPrograms.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">Program tidak ditemukan</p>
                )}
                {filteredPrograms.map((p) => {
                  const count = registrations.filter((r) => {
                    const event = events.find((e) => e.id === r.event_id);
                    return event?.program_id === p.id;
                  }).length;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProgramId(p.id); setShowProgramPicker(false); setSearchProgram(""); }}
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
                        {p.code} · {count} daftar
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
          Menampilkan {rankingBarData.length} program teratas berdasarkan jumlah pendaftar
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
