# Rencana: CRUD Tipe Event dan Pengaturan Pembayaran

## Yang akan dibuat
- Halaman admin khusus untuk menambah, mengubah, menonaktifkan, dan menghapus tipe event; tipe yang sudah dipakai event tidak bisa dihapus permanen, tetapi bisa dinonaktifkan.
- Setiap tipe memiliki metode pendaftaran bawaan: gratis, infaq, atau wajib bayar, beserta status aktif.
- Form Buat/Edit Event mengambil tipe dari daftar admin. Metode pembayaran bawaan tipe terpilih mengisi pilihan pembayaran event; tipe berbayar tetap memakai input harga atau pilihan kelas/posisi yang sudah ada.
- Tipe event lama dipertahankan dan dimasukkan ke pengelolaan baru. Pengaturan event lama tidak diubah.

## Langkah implementasi
1. Tambahkan tabel `public.event_types` melalui migrasi, isi tipe lama dengan mode pembayaran awal yang sesuai data/perilaku saat ini, dan atur akses baca publik serta perubahan hanya untuk admin.
2. Bangun halaman CRUD admin dan tautkan dari navigasi admin.
3. Ganti daftar tipe hardcoded pada form Buat/Edit Event dengan data aktif dari tabel, lalu terapkan mode pembayaran tipe sebagai nilai awal.
4. Tambahkan tes untuk mode gratis, infaq, dan wajib bayar, lalu verifikasi alur pilihan tipe dan penyimpanan event.
5. Catat aturan struktur tipe event di `AGENTS.md` dan perbarui roadmap.

## Detail teknis
- `events.event_type` dan `events.registration_type` tetap dipertahankan agar data lama dan alur pendaftaran kompatibel.
- Penghapusan tipe yang telah dipakai event ditolak; admin dapat menonaktifkannya agar tidak dipilih untuk event baru.
- Asumsi sementara: mode pembayaran tipe menjadi nilai awal event baru dan admin masih dapat mengubahnya per event. Event yang sudah tersimpan tidak ikut berubah.
