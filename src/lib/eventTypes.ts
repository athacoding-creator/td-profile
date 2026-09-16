// Tipe event yang memakai daftar pilihan berharga (posisi olahraga / kelas kajian).
// "futsal" & "mini-soccer" dipertahankan untuk kompatibilitas data lama.
export const CLASS_EVENT_TYPES = [
  "kelas-kajian",
  "event",
  // legacy
  "bedah-buku",
  "ruqyah",
  "bedah-buku-ruqyah",
  "mini-soccer",
];

// Tipe yang secara default (dan wajib) mengizinkan pendaftaran rombongan.
export const GROUP_CLASS_EVENT_TYPES = ["event", "bedah-buku", "ruqyah", "bedah-buku-ruqyah"];

export const POSITION_EVENT_TYPES = ["olahraga", "futsal", ...CLASS_EVENT_TYPES];

export const EVENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "kajian", label: "Kajian" },
  { value: "olahraga", label: "Olahraga" },
  { value: "kelas-kajian", label: "Kelas Kajian" },
  { value: "event", label: "Event" },
];


export const isPositionEvent = (type?: string | null) => POSITION_EVENT_TYPES.includes(type ?? "");

export const isClassEvent = (type?: string | null) => CLASS_EVENT_TYPES.includes(type ?? "");

export const isGroupClassEvent = (type?: string | null) => GROUP_CLASS_EVENT_TYPES.includes(type ?? "");

export const positionLabel = (type?: string | null) => (isClassEvent(type) ? "Kelas" : "Posisi");
