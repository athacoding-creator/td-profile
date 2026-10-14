import { isEventExpired } from "@/lib/eventSchedule";
import { POSITION_EVENT_TYPES } from "@/lib/eventTypes";

// datetime-local value -> ISO string with local timezone offset preserved
export const localInputToISO = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

export const buildEpisodeUrls = (urls: string[] = [], count: number) => {
  const normalized = Array.isArray(urls) ? urls : [];
  return Array.from({ length: Math.max(0, count) }, (_, index) => normalized[index] || "");
};

export const isExpired = (ev: any) => isEventExpired(ev);
export const SPORT_EVENT_TYPES = POSITION_EVENT_TYPES;
export const DEFAULT_POSITIONS = [
  { position: "Pemain Lapangan", price: "10000", max_slots: "21", description: "" },
  { position: "Kiper", price: "15000", max_slots: "4", description: "" },
];
export const DEFAULT_CLASSES = [
  { position: "Class 1", price: "100000", max_slots: "50", description: "" },
  { position: "Class 2", price: "50000", max_slots: "50", description: "" },
  { position: "Class 3", price: "15000", max_slots: "100", description: "" },
];
export const defaultRowsFor = (type?: string | null) =>
  (isClassEvent(type) ? DEFAULT_CLASSES : DEFAULT_POSITIONS).map((entry) => ({ ...entry, id: crypto.randomUUID() }));

export const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

