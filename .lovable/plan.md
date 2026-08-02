# Perbaikan Daftar Futsal & Daftar Rombongan

Saya sudah cek database dan kode. Kedua fitur gagal karena aturan lama di database yang belum menyesuaikan fitur baru — bukan sekadar bug tampilan.

## Temuan (sudah diverifikasi)

**1. Daftar Rombongan selalu gagal**
- Kolom `user_id` di tabel `registrations` masih **wajib diisi**, padahal peserta rombongan (tamu) didaftarkan dengan `user_id` kosong → insert ditolak.
- Aturan akses (izin tambah data) hanya mengizinkan baris milik akun sendiri (`user_id = akun login`), jadi baris tamu tetap ditolak walau kolomnya dibuat opsional.
- Ada **dua** aturan unik `(user_id, event_id)` → menghalangi satu akun mendaftarkan banyak tamu bila nanti diisi id pendaftar.
- Pemeriksa gender program membaca data profil dari `user_id`; untuk tamu (tanpa akun) pemeriksaan ini akan error/menolak.

**2. Daftar Futsal / Mini Soccer selalu gagal**
- Tabel harga posisi (`event_position_pricing`) memakai pengecekan admin versi lama `has_role(auth.uid(), 'admin')` bertipe teks. Fungsi versi teks itu **rusak**: kondisi `WHERE user_id = user_id` selalu benar (nama parameter menutupi nama kolom), sehingga hasilnya acak/salah. Akibatnya admin gagal menyimpan daftar posisi & harga — terbukti di database: **0 baris harga posisi dan 0 event futsal** yang berhasil dibuat.
- Selain rusak, fungsi ini juga celah keamanan (bisa mengembalikan "admin" untuk sembarang user).
- Pemeriksa nominal pembayaran mewajibkan `amount_paid` **persis sama** dengan harga event. Pada futsal harga mengikuti posisi (Kiper/Pemain), dan pada rombongan nominal dibagi per peserta → selalu ditolak.

## Rencana Perbaikan

### Tahap 1 — Migrasi database
1. `registrations.user_id` dibuat opsional (boleh kosong untuk peserta tamu).
2. Hapus dua aturan unik lama, ganti dengan satu aturan unik yang hanya berlaku bila `user_id` terisi — sehingga satu akun bisa mendaftarkan banyak tamu, tapi tetap tidak bisa mendaftar dobel untuk dirinya sendiri.
3. Perbarui aturan akses `registrations`:
   - Tambah data: diizinkan bila baris milik akun sendiri **atau** baris tamu yang didaftarkan oleh akun tersebut.
   - Lihat/ubah data: pendaftar tetap bisa melihat & mengubah baris tamu yang ia daftarkan; admin tetap penuh.
4. Perbaiki pemeriksa gender program agar melewati baris tamu (tanpa akun) dan memakai gender tamu bila ada.
5. Perbaiki pemeriksa nominal: bila event futsal/mini soccer, nominal divalidasi terhadap harga posisi yang dipilih; untuk rombongan divalidasi per peserta, bukan total.
6. Ganti aturan admin pada `event_position_pricing` agar memakai fungsi admin yang benar (`is_admin()`), lalu **hapus fungsi `has_role(user_id uuid, role_name text)` yang rusak** setelah dipastikan tidak ada aturan lain yang memakainya (aturan pada `payment_methods` juga memakainya dan akan ikut diperbaiki).
7. Pastikan hak akses (GRANT) `event_position_pricing` benar untuk publik baca & admin tulis.

### Tahap 2 — Perbaikan kode
- `src/pages/admin/Events.tsx`: bila penyimpanan harga posisi gagal, tampilkan pesan error jelas dan jangan tinggalkan event tanpa harga (rollback/peringatan).
- `src/pages/EventDetail.tsx`: alur futsal saat ini selalu melompat ke halaman bayar dan melewati cek kuota & gender — dirapikan agar kuota/gender tetap dicek, dan event futsal gratis tidak dipaksa ke halaman bayar.
- `src/pages/Payment.tsx`: kirim `position` + harga posisi per peserta secara konsisten (termasuk saat rombongan), dan tampilkan pesan error dari database apa adanya agar mudah didiagnosis.

### Tahap 3 — Verifikasi
- Uji: admin buat event futsal dengan 2 posisi → user daftar pilih posisi → bayar; dan user daftar rombongan 3 orang pada event gratis, infaq, dan berbayar. Cek baris masuk di tabel `registrations` serta muncul di dashboard Pendaftar.

## Catatan teknis
Perubahan database dijalankan sebagai satu migrasi; kolom `user_id` yang menjadi opsional aman karena saat ini tidak ada baris dengan `user_id` kosong (sudah dicek: 0 baris).
