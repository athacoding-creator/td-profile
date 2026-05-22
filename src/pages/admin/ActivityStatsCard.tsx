import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function ActivityStatsCard({
  attendance, redemptions, registrations, logins,
}: { attendance: any[]; redemptions: any[]; registrations: any[]; logins: any[] }) {
  const [kind, setKind] = useState<ChartKind>("bar");

  const weekly = useMemo(() => buildWeekly(attendance, redemptions), [attendance, redemptions]);
  const daily = useMemo(() => buildDaily(attendance, redemptions), [attendance, redemptions]);

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

  const tabs: { key: ChartKind; label: string; icon: any }[] = [
    { key: "bar", label: "Bar", icon: BarChart3 },
    { key: "donut", label: "Donut", icon: PieIcon },
    { key: "line", label: "Line", icon: LineIcon },
  ];

  return (
    <div className="rounded-2xl bg-card p-4 sm:p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex flex-col gap-3 sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold">Statistik Aktivitas</h2>
          <p className="text-xs text-muted-foreground">Ringkasan jamaah hadir & reward yang ditukar</p>
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
            onClick={() => exportStatsXLSX({ attendance, redemptions, registrations, logins, weekly, daily, totals })}
            className="gap-1.5 text-[11px] sm:text-xs h-7 sm:h-8"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" /> Excel
          </Button>
        </div>
      </div>

      <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 sm:gap-3">
        <Legendy color={COLORS.male} label="Laki-laki" value={totals.male} />
        <Legendy color={COLORS.female} label="Perempuan" value={totals.female} />
        <Legendy color={COLORS.reward} label="Reward" value={totals.reward} />
      </div>

      <div className="mt-4 h-56 sm:h-64 md:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "bar" ? (
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
          ) : kind === "donut" ? (
            <PieChart>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
            </PieChart>
          ) : (
            <LineChart data={daily} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="male" name="Laki-laki" stroke={COLORS.male} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="female" name="Perempuan" stroke={COLORS.female} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="reward" name="Reward" stroke={COLORS.reward} strokeWidth={2.5} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
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
