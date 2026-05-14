import * as XLSX from "xlsx";

type Row = Record<string, any>;

/** Helper: set column widths on a worksheet */
function setCols(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((w) => ({ wch: w }));
}

export function exportStatsXLSX(opts: {
  attendance: any[];
  redemptions: any[];
  registrations: any[];
  logins: any[];
  weekly: { label: string; male: number; female: number; reward: number }[];
  daily: { label: string; male: number; female: number; reward: number }[];
  totals: { male: number; female: number; reward: number };
}) {
  const { attendance, redemptions, registrations, logins, weekly, daily, totals } = opts;
  const wb = XLSX.utils.book_new();

  /* ── 1. Ringkasan ──────────────────────────────────────────────── */
  const summary: Row[] = [
    { Metrik: "Jamaah Hadir (Laki-laki)", Total: totals.male },
    { Metrik: "Jamaah Hadir (Perempuan)", Total: totals.female },
    { Metrik: "Total Jamaah Hadir", Total: totals.male + totals.female },
    { Metrik: "Reward Ditukar (approved)", Total: totals.reward },
    { Metrik: "Total Pendaftar", Total: registrations.length },
    { Metrik: "Total Login Tercatat", Total: logins.length },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  setCols(wsSummary, [36, 12]);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

  /* ── 2. Statistik Per Minggu ───────────────────────────────────── */
  const wsWeekly = XLSX.utils.json_to_sheet(
    weekly.map((r) => ({
      Minggu: r.label,
      "Laki-laki": r.male,
      Perempuan: r.female,
      "Total Hadir": r.male + r.female,
      "Reward Ditukar": r.reward,
    })),
  );
  setCols(wsWeekly, [16, 12, 12, 14, 16]);
  XLSX.utils.book_append_sheet(wb, wsWeekly, "Per Minggu");

  /* ── 3. Statistik Per Hari ─────────────────────────────────────── */
  const wsDaily = XLSX.utils.json_to_sheet(
    daily.map((r) => ({
      Tanggal: r.label,
      "Laki-laki": r.male,
      Perempuan: r.female,
      "Total Hadir": r.male + r.female,
      "Reward Ditukar": r.reward,
    })),
  );
  setCols(wsDaily, [12, 12, 12, 14, 16]);
  XLSX.utils.book_append_sheet(wb, wsDaily, "Per Hari");

  /* ── 4. Detail Hadir Per Akun ──────────────────────────────────── */
  const wsAttendance = XLSX.utils.json_to_sheet(
    attendance.map((a, i) => ({
      No: i + 1,
      Tanggal: new Date(a.scanned_at).toLocaleString("id-ID"),
      Nama: a.profiles?.full_name ?? "-",
      Gender: a.profiles?.gender === "L" ? "Laki-laki" : a.profiles?.gender === "P" ? "Perempuan" : (a.profiles?.gender ?? "-"),
      "Event ID": a.event_id ?? "-",
      "Poin Diperoleh": a.points_awarded ?? 0,
    })),
  );
  setCols(wsAttendance, [5, 22, 28, 12, 38, 16]);
  XLSX.utils.book_append_sheet(wb, wsAttendance, "Detail Hadir");

  /* ── 5. Detail Pendaftar Per Akun ──────────────────────────────── */
  const wsRegistrations = XLSX.utils.json_to_sheet(
    registrations.map((r, i) => ({
      No: i + 1,
      "Tanggal Daftar": new Date(r.created_at).toLocaleString("id-ID"),
      Nama: r.profiles?.full_name ?? "-",
      Email: r.profiles?.email ?? "-",
      Gender: r.profiles?.gender === "L" ? "Laki-laki" : r.profiles?.gender === "P" ? "Perempuan" : (r.profiles?.gender ?? "-"),
      Kota: r.profiles?.city ?? "-",
      Event: r.events?.title ?? "-",
      Program: r.events?.programs?.name ?? "-",
    })),
  );
  setCols(wsRegistrations, [5, 22, 28, 30, 12, 18, 36, 22]);
  XLSX.utils.book_append_sheet(wb, wsRegistrations, "Detail Pendaftar");

  /* ── 6. Detail Penukaran Per Akun ──────────────────────────────── */
  const wsRedemptions = XLSX.utils.json_to_sheet(
    redemptions.map((r, i) => ({
      No: i + 1,
      Tanggal: new Date(r.created_at).toLocaleString("id-ID"),
      Nama: r.profiles?.full_name ?? "-",
      Email: r.profiles?.email ?? "-",
      Reward: r.rewards?.name ?? "-",
      "Poin Digunakan": r.cost_points ?? 0,
      Status: r.status ?? "-",
    })),
  );
  setCols(wsRedemptions, [5, 22, 28, 30, 28, 16, 14]);
  XLSX.utils.book_append_sheet(wb, wsRedemptions, "Detail Penukaran");

  /* ── 7. Riwayat Login Per Akun ─────────────────────────────────── */
  const wsLogins = XLSX.utils.json_to_sheet(
    logins.map((l, i) => ({
      No: i + 1,
      "Waktu Login": new Date(l.created_at).toLocaleString("id-ID"),
      Nama: l.profiles?.full_name ?? "-",
      Email: l.profiles?.email ?? "-",
      "User Agent": l.user_agent ?? "-",
    })),
  );
  setCols(wsLogins, [5, 22, 28, 30, 60]);
  XLSX.utils.book_append_sheet(wb, wsLogins, "Riwayat Login");

  /* ── Simpan file ───────────────────────────────────────────────── */
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `statistik-admin-${stamp}.xlsx`);
}
