# Perbaikan Kuota Peserta & Sistem QRIS Berkategori

## Temuan (sudah diverifikasi)

**1. Max Peserta tidak pernah berfungsi**
- Pengecekan kuota dilakukan di browser dengan menghitung baris pendaftar. Karena aturan akses database hanya mengizinkan user melihat pendaftarannya sendiri, hitungan yang kembali selalu 0–1, bukan jumlah pendaftar sesungguhnya. Jadi kuota praktis tidak pernah penuh.
- Pengecekan hanya berjalan di halaman detail event. Baris pendaftaran sebenarnya baru dibuat di halaman bayar, jadi antara cek dan simpan tidak ada penjagaan (dua orang bisa lolos bersamaan).
- Tidak ada penjagaan kuota di sisi database.

**2. Sisa kode metode pembayaran lama yang rusak**
- Halaman detail event dan halaman bayar masih membaca kolom `payment_method_id` pada tabel event, padahal kolom itu tidak ada (dicek: query menghasilkan error "column events.payment_method_id does not exist"). Di detail event error ini tertutup query cadangan; di halaman bayar tidak ada cadangan.

**3. QRIS Manager terlalu kaku**
- Kategori QRIS hanya dua nilai tetap: "Pembayaran" dan "Infaq". Tidak bisa membuat kategori seperti Kelas, Futsal, dll.
- Saat bayar, sistem mengambil QRIS aktif pertama pada kategori itu — event tidak bisa diarahkan ke QRIS tertentu.

## Rencana Perbaikan

### Tahap 1 — Kuota peserta (database + kode)
1. Tambah fungsi hitung pendaftar aman di database yang bisa dibaca semua orang (hanya mengembalikan angka, bukan data peserta), plus penjagaan otomatis saat baris pendaftaran dibuat: bila kuota penuh, penyimpanan ditolak dengan pesan "Kuota peserta sudah penuh".
2. Halaman detail event: tampilkan sisa kuota ("12/50 terisi", "Kuota penuh") dan nonaktifkan tombol daftar bila penuh, memakai fungsi hitung tadi.
3. Halaman bayar & pendaftaran rombongan: cek ulang kuota sebelum simpan dan tampilkan pesan dari database apa adanya bila ditolak.
4. Untuk rombongan, kuota dihitung dari jumlah peserta yang didaftarkan, bukan satu.

### Tahap 2 — Kategori pembayaran & QRIS
1. Buat tabel kategori pembayaran yang dikelola admin (nama, keterangan, aktif) — misalnya Kelas, Futsal, Camp. Kategori "Infaq" tetap bawaan sistem dan alurnya tidak diubah.
2. Tabel QRIS: ganti kategori dari dua pilihan tetap menjadi rujukan ke kategori pembayaran, dengan menjaga data lama (QRIS "paid" dipetakan ke kategori umum "Pembayaran", "infaq" tetap infaq).
3. Tabel event: tambah pilihan kategori pembayaran dan (opsional) QRIS spesifik. Event berbayar memilih kategori; event infaq tetap otomatis memakai QRIS infaq seperti sekarang.

### Tahap 3 — Perapihan halaman QRIS Manager
- Dua tab: **Kategori Pembayaran** (kelola daftar kategori) dan **Daftar QRIS**.
- Daftar QRIS dikelompokkan per kategori, dengan filter kategori, pencarian nama, badge status aktif, dan tombol urutan naik/turun tetap ada.
- Form tambah/edit: nama, kategori (dropdown dari kategori yang dikelola admin), keterangan, gambar QRIS, status aktif; preview seperti sekarang.
- Peringatan bila ada kategori tanpa QRIS aktif, supaya event berbayar tidak kehabisan tujuan pembayaran.

### Tahap 4 — Alur bayar user
- Halaman bayar mengambil QRIS berdasarkan QRIS yang dipilih event, lalu kategori event, lalu fallback kategori umum. Bila tidak ada QRIS aktif, tampilkan pesan jelas — jangan layar kosong.
- Hapus sisa pemakaian `payment_method_id` di halaman detail event dan halaman bayar.
- Alur infaq (nominal bebas / doa terbaik / tanpa verifikasi admin) tidak diubah sama sekali.

### Tahap 5 — Verifikasi
- Buat event berkuota 2, daftarkan sampai penuh, pastikan pendaftar ketiga ditolak (termasuk lewat rombongan).
- Buat kategori "Futsal" + QRIS-nya, buat event futsal berbayar, pastikan QRIS yang muncul sesuai kategori.
- Pastikan event infaq masih memunculkan QRIS infaq dengan alur yang sama.

## Catatan teknis
Satu migrasi database: fungsi hitung pendaftar + trigger kuota, tabel `payment_categories` (dengan GRANT, publik baca / admin tulis), kolom kategori pada `qris_methods` dan `events`, serta migrasi data kategori lama. Kode yang disentuh: `src/pages/EventDetail.tsx`, `src/pages/Payment.tsx`, `src/pages/admin/QrisManager.tsx`, `src/pages/admin/Events.tsx`.
