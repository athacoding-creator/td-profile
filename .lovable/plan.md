## Ringkasan masalah

1. Event yang sudah lewat (status `finished` setelah auto-archive admin) hilang dari "Event terbaru" maupun "Arsip" karena query Index hanya ambil `status='active'` dan Archive hanya ambil event >30 hari.
2. Dashboard user menampilkan semua event sekaligus; kamu mau hanya 6 (seperti saforiginal.id).
3. Bottom nav saat ini: Beranda / Event(→/poin) / Riwayat / Profil — tab "Event" sebenarnya membuka halaman Poin. Kamu mau tab Event jadi halaman daftar semua event (mendatang + expired), dan Poin dipindah ke menu Profil (sudah ada link di sana).
4. Excel export per event harus berformat tabel rapi per akun (mengikuti contoh donatur yang diupload: No, Tanggal, Nama, WhatsApp, Campaign/Event, dll).

---

## Rencana perubahan

### 1. Dashboard user (`src/pages/Index.tsx`)
- Query: ambil event `status IN ('active','finished')`, urut `starts_at desc`, **limit 6**.
- Event yang sudah lewat (cek `ends_at`/`starts_at+6h` < now) ditampilkan dengan poster grayscale + badge "Selesai" (mirip pattern locked yang sudah ada).
- Ganti link "Lihat arsip →" jadi "Lihat semua event →" yang menuju halaman Event baru (`/event`).

### 2. Halaman Event baru (`src/pages/Events.tsx`)
- Route baru `/event` (list). Detail tetap `/event/:id`.
- Dua section: **Event Mendatang** (active, `ends_at`/fallback ≥ now, urut asc) dan **Event Selesai** (finished atau sudah lewat, urut desc, paginasi/load more sederhana).
- Reuse kartu event yang sama dengan dashboard.

### 3. Bottom navigation (`src/components/BottomNav.tsx`)
- Urutan baru: Beranda · **Event** (→`/event`) · Riwayat · Profil.
- Hapus entri Poin dari bottom nav. Akses Poin tetap lewat menu di halaman Profil (`/poin`, sudah ada).

### 4. Halaman Archive lama (`src/pages/Archive.tsx`)
- Tidak lagi dipakai dari Dashboard. Tetap dibiarkan ada (route `/arsip`) untuk kompatibilitas tapi tidak ditautkan dari mana pun, atau dihapus. Rekomendasi: **hapus** untuk hindari duplikasi dengan halaman Event baru.

### 5. Excel export per event (`src/pages/admin/Events.tsx` fungsi `exportXLSX`)
Format mengikuti contoh:
- Sheet 1 **Info Event**: Judul, Tipe, Program, Venue, Kota, Mulai, Selesai, Total Pendaftar, Total Hadir, Total Tidak Hadir.
- Sheet 2 **Peserta** (satu baris per akun, urut Tanggal Daftar asc):

  | No | Tanggal Daftar | Nama | WhatsApp | Gender | Kota | Email | Status Hadir | Waktu Hadir | Poin Diperoleh |

  - "Status Hadir" = `Hadir` / `Tidak Hadir` (mengikuti gaya kolom Status di contoh).
  - Tambahkan baris **Total** di bawah kolom angka.
  - Kolom diberi lebar yang proporsional + freeze header row.
- Nama file: `peserta-{slug-judul}-{tanggal}.xlsx`.

### 6. Routing (`src/App.tsx`)
- Tambah `const Events = lazy(...)` dan `<Route path="/event" element={<Events />} />`.
- Hapus route `/arsip` jika file Archive dihapus.

---

## Catatan teknis

- RLS `events_public_read` sudah mengizinkan baca `active` + `finished`, jadi tidak perlu migrasi DB.
- Auto-mark expired→finished saat ini hanya jalan ketika admin buka panel. Untuk konsistensi, frontend user juga akan menentukan "selesai" berdasarkan `ends_at`/`starts_at+6h` (tampilan), tanpa update DB.
- Tidak ada perubahan skema DB, edge function, atau auth.
