// Tipe event yang memakai daftar pilihan berharga (posisi olahraga / kelas kajian).
// "futsal" & "mini-soccer" dipertahankan untuk kompatibilitas data lama.
export const POSITION_EVENT_TYPES = ["olahraga", "kelas-kajian", "futsal", "mini-soccer"];

export const isPositionEvent = (type?: string | null) => POSITION_EVENT_TYPES.includes(type ?? "");

export const isClassEvent = (type?: string | null) => type === "kelas-kajian" || type === "mini-soccer";

export const positionLabel = (type?: string | null) => (isClassEvent(type) ? "Kelas" : "Posisi");
