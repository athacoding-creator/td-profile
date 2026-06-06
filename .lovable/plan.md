## Tujuan
Tampilkan nominal yang dipilih user (50.000 / 25.000 / dst) + pesan doa di halaman **Pendaftar** dan **Kehadiran**, dan ikutkan di file download Excel. **Tidak menyentuh** alur approval admin Donasi (infaq tetap tanpa approval).

## Perubahan

### 1. `src/pages/admin/useAdminData.ts`
- Tambah `donor_message` di select query `registrations` dan `attendance` (via join `registrations`).
- Untuk Kehadiran: ambil juga `amount_paid`, `donor_message`, `payment_status` dari tabel `registrations` (join by `event_id` + `user_id`) supaya kita tahu nominal user saat hadir.

### 2. `src/pages/admin/Pendaftar.tsx`
- **Desktop**: tambah kolom **Nominal** & **Pesan Doa** (hanya isi jika event paid/infaq, kosong/`—` untuk free).
- **Mobile card**: tambah baris kecil "Rp 50.000 · 💬 doa singkat..." (truncate 1 baris).
- Klik baris/card → expand untuk lihat doa lengkap (opsional, kalau ringkas pakai `title` tooltip saja).

### 3. `src/pages/admin/Registrations.tsx` (Kehadiran)
- Tambah kolom **Nominal** + **Pesan Doa** di tabel desktop & mobile card.
- Tambah field `Nominal` dan `Pesan Doa` di export `exportXLSX()` → kolom baru di file `kehadiran-*.xlsx`.

### 4. Tambah tombol download di Pendaftar (opsional tapi sejalan dengan request "dapat di-download")
- Tombol **Download Excel** di `Pendaftar.tsx` (mirip tombol di Kehadiran), kolom: Tanggal Daftar, Nama, WhatsApp, Gender, Kota, Email, Event, **Nominal**, **Pesan Doa**.

## Catatan
- Tidak ada migrasi DB; semua field sudah ada (`amount_paid`, `donor_message`).
- Tidak mengubah halaman Donasi sama sekali.
- Format nominal: `Rp 50.000` pakai `toLocaleString("id-ID")`.
