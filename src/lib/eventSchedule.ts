// Helpers for events: recurring (mingguan) + lifecycle status.
// All time math uses the browser's local TZ; the DB enforces Asia/Jakarta server-side.

export const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export type RecurringFields = {
  is_recurring?: boolean | null;
  recurring_days?: number[] | null;
  recurring_start_time?: string | null; // "HH:MM:SS" or "HH:MM"
  recurring_end_time?: string | null;
  recurring_until?: string | null; // "YYYY-MM-DD"
};

export type EventLike = RecurringFields & {
  starts_at: string;
  ends_at?: string | null;
  status?: string | null;
};

const parseHM = (t?: string | null) => {
  if (!t) return [0, 0];
  const [h, m] = t.split(":").map(Number);
  return [h || 0, m || 0];
};

export const isRecurring = (ev: EventLike) => !!ev.is_recurring;

/** Apakah event sudah benar-benar berakhir (untuk badge "selesai"). */
export const isEventExpired = (ev: EventLike) => {
  if (ev.status === "archived") return true;
  if (isRecurring(ev)) {
    if (!ev.recurring_until) return false;
    const until = new Date(ev.recurring_until + "T23:59:59");
    return Date.now() > until.getTime();
  }
  const end = ev.ends_at
    ? new Date(ev.ends_at)
    : new Date(new Date(ev.starts_at).getTime() + 6 * 3600 * 1000);
  return Date.now() > end.getTime();
};

export type ScanWindow = {
  expired: boolean;
  scanAvailable: boolean;
  scanNotYetAvailable: boolean;
  scanStartTime: Date;
  scanEndTime: Date;
  message?: string;
};

/** Hitung window scan QR untuk satu event (recurring atau sekali jalan). */
export const computeScanWindow = (ev: EventLike): ScanWindow => {
  const now = new Date();
  if (isRecurring(ev)) {
    const days = ev.recurring_days ?? [];
    const [sh, sm] = parseHM(ev.recurring_start_time);
    const [eh, em] = parseHM(ev.recurring_end_time);
    const start = new Date(now); start.setHours(sh, sm, 0, 0);
    const end = new Date(now); end.setHours(eh, em, 0, 0);
    const scanStart = new Date(start.getTime() - 60 * 60 * 1000);
    const expired = isEventExpired(ev);
    const inDay = days.includes(now.getDay());
    if (expired) return { expired: true, scanAvailable: false, scanNotYetAvailable: false, scanStartTime: scanStart, scanEndTime: end, message: "Event berkelanjutan sudah berakhir" };
    if (!inDay) {
      const upcomingDay = days.length
        ? days.map((d) => DAY_NAMES[d]).join(", ")
        : "—";
      return { expired: false, scanAvailable: false, scanNotYetAvailable: true, scanStartTime: scanStart, scanEndTime: end, message: `Scan tersedia setiap hari ${upcomingDay}` };
    }
    if (now < scanStart) return { expired: false, scanAvailable: false, scanNotYetAvailable: true, scanStartTime: scanStart, scanEndTime: end };
    if (now > end) return { expired: false, scanAvailable: false, scanNotYetAvailable: false, scanStartTime: scanStart, scanEndTime: end, message: "Acara hari ini sudah selesai" };
    return { expired: false, scanAvailable: true, scanNotYetAvailable: false, scanStartTime: scanStart, scanEndTime: end };
  }
  const start = new Date(ev.starts_at);
  const end = ev.ends_at ? new Date(ev.ends_at) : new Date(start.getTime() + 6 * 3600 * 1000);
  const scanStart = new Date(start.getTime() - 60 * 60 * 1000);
  const expired = isEventExpired(ev);
  return {
    expired,
    scanAvailable: !expired && now >= scanStart && now <= end,
    scanNotYetAvailable: !expired && now < scanStart,
    scanStartTime: scanStart,
    scanEndTime: end,
  };
};

export const describeRecurring = (ev: EventLike) => {
  if (!isRecurring(ev)) return "";
  const days = (ev.recurring_days ?? []).map((d) => DAY_NAMES[d]).join(", ") || "—";
  const s = (ev.recurring_start_time ?? "").slice(0, 5);
  const e = (ev.recurring_end_time ?? "").slice(0, 5);
  return `Berulang ${days} · ${s}–${e}`;
};