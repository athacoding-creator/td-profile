## Tujuan
Ubah format file Excel yang di-download dari tombol Download di halaman admin **Events** supaya kolomnya mengikuti urutan & gaya seperti screenshot referensi (donatur sheet).

## Perubahan

### File: `src/pages/admin/Events.tsx` — fungsi `exportXLSX`
Sheet **"Peserta"** diubah kolomnya menjadi (urut kiri → kanan):

| # | Kolom | Isi |
|---|-------|-----|
| 1 | No | nomor urut |
| 2 | Tanggal | tanggal daftar (format `dd/MM/yy, HH.mm` seperti screenshot) |
| 3 | Nama | `profiles.full_name` |
| 4 | WhatsApp | `profiles.phone` (tanpa awalan `+`, mirip `83844483839` di screenshot) |
| 5 | Event | `ev.title` (analog kolom "Campaign") |
| 6 | Status Hadir | `Hadir` / `Tidak Hadir` |
| 7 | Poin | `attendance.points_awarded` (0 kalau tidak hadir) |
| 8 | Pesan | dikosongkan (placeholder; bisa diisi manual oleh admin di Excel) |

Kolom lama yang dibuang dari sheet ini: Gender, Kota, Email, Waktu Hadir. (Tetap tersedia di sheet "Info Event" / data lain bila perlu).

Lebar kolom (`!cols`): `[5, 18, 28, 18, 36, 14, 10, 30]`.

Baris **TOTAL** di bawah dipertahankan (No kosong, Nama = "TOTAL", Status Hadir = `hadir / total`, Poin = sum).

Freeze header row tetap ada.

### Sheet "Info Event"
Tidak diubah — tetap berisi metadata event + ringkasan.

### Format Tanggal
Tambahkan helper kecil di file yang sama:
```ts
const fmtTanggal = (d: string|Date) => {
  const x = new Date(d);
  const dd = String(x.getDate()).padStart(2,"0");
  const mm = String(x.getMonth()+1).padStart(2,"0");
  const yy = String(x.getFullYear()).slice(-2);
  const hh = String(x.getHours()).padStart(2,"0");
  const mi = String(x.getMinutes()).padStart(2,"0");
  return `${dd}/${mm}/${yy}, ${hh}.${mi}`;
};
```

## Yang TIDAK diubah
- `src/pages/admin/exportStats.ts` (export agregat admin) — beda konteks.
- UI halaman Events — hanya file Excel-nya yang berubah.
- Tombol/route apapun.

## Verifikasi
Setelah implementasi: jalankan build, lalu minta user download 1 event untuk konfirmasi visual.
