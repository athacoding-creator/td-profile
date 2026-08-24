# Ubah Tipe Event: Olahraga & Kelas Kajian

## Tujuan
Dropdown Tipe event menjadi: **Kajian**, **Olahraga**, **Kelas Kajian**.

- **Olahraga** (menggantikan Futsal/Mini Soccer): sistem tetap sama persis — daftar posisi (Pemain Lapangan, Kiper, dst) dengan harga + kuota.
- **Kelas Kajian** (baru): baris yang sama dipakai untuk kelas, tapi labelnya berubah menjadi **Nama Kelas**, **Benefit/Keterangan kelas**, **Harga**, dan **Kuota**.

## Perubahan Data
- Tambah kolom `description` (teks, boleh kosong) pada tabel harga per posisi, dipakai untuk penjelasan benefit tiap kelas.
- Data lama dipetakan: event bertipe `futsal` → `olahraga`, `mini-soccer` → `kelas-kajian`. Tidak ada data pendaftaran/harga yang hilang.

## Perubahan Admin (Buat & Edit Event)
- Dropdown Tipe: Kajian / Olahraga / Kelas Kajian.
- Jika **Olahraga**: tampilan seperti sekarang (Posisi, Harga, Kuota), preset default Pemain Lapangan 21 / Kiper 4.
- Jika **Kelas Kajian**: kartu berjudul "Daftar kelas & harga" dengan kolom Nama Kelas, Benefit (textarea singkat), Harga, Kuota; preset default Class 1/2/3 kosong benefit.
- Kedua tipe tetap otomatis "wajib bayar" seperti perilaku sekarang.

## Perubahan Halaman User (Detail Event)
- Dialog pemilihan tetap ada, judul menyesuaikan: "Pilih posisi" (Olahraga) vs "Pilih kelas" (Kelas Kajian).
- Untuk Kelas Kajian, tiap opsi menampilkan nama kelas, teks benefit di bawahnya, harga, dan sisa kuota ("12/50 terisi"); kelas penuh terkunci.
- Halaman pembayaran menampilkan label "Kelas: ..." alih-alih "Posisi: ..." untuk tipe kelas kajian (pesan WhatsApp admin ikut menyesuaikan).

## Catatan Teknis
- Konstanta `SPORT_EVENT_TYPES` di `src/pages/admin/Events.tsx` diganti daftar tipe berbasis posisi: `["olahraga", "kelas-kajian", "futsal", "mini-soccer"]` (dua terakhir sebagai kompatibilitas mundur), plus helper `isClassEvent(type)`.
- Migrasi SQL: `ALTER TABLE public.event_position_pricing ADD COLUMN description text;` lalu `UPDATE public.events SET event_type = ...` untuk pemetaan nilai lama.
- Trigger `validate_registration_amount` dan `enforce_position_quota` diperbarui agar mengenali `olahraga`/`kelas-kajian` (saat ini hanya cek `futsal`/`mini-soccer`).
- File terdampak: `src/pages/admin/Events.tsx`, `src/pages/EventDetail.tsx`, `src/pages/Payment.tsx`.
