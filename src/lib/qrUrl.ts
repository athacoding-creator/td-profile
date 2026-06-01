// Helpers untuk membangun URL absolut yang dimasukkan ke dalam QR.
// Dengan URL lengkap, kamera HP / Google Lens dapat langsung membuka
// halaman /scan website alih-alih menampilkan teks token mentah.

const origin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

export const buildEventQrUrl = (eventId: string, token: string) =>
  `${origin()}/scan?e=${encodeURIComponent(eventId)}&t=${encodeURIComponent(token)}`;

export const buildProgramQrUrl = (programId: string, token: string) =>
  `${origin()}/scan?p=${encodeURIComponent(programId)}&t=${encodeURIComponent(token)}`;

/**
 * Ekstrak token dari hasil decode QR. Toleran terhadap dua format:
 * 1. Token mentah UUID (QR lama)
 * 2. URL lengkap ke /scan?e=...&t=... atau /scan?p=...&t=...
 * Mengembalikan { token, eventId?, programId? }.
 */
export const parseScannedQr = (
  raw: string,
): { token: string; eventId?: string; programId?: string } => {
  const v = (raw ?? "").trim();
  if (!v) return { token: "" };
  try {
    const url = new URL(v);
    const t = url.searchParams.get("t") ?? "";
    return {
      token: t || v,
      eventId: url.searchParams.get("e") ?? undefined,
      programId: url.searchParams.get("p") ?? undefined,
    };
  } catch {
    return { token: v };
  }
};