## 1. Doa terbaik wajib saat mendaftar event

**Masalah**: Saat ini `donor_message` hanya diminta secara opsional di halaman `/event/:id/bayar` (Payment.tsx), sehingga banyak registrasi kosong. Untuk event `free`, doa bahkan tidak pernah diminta.

**Perbaikan**:
- Tambahkan modal **"Kirim Doa Terbaik"** di `src/pages/EventDetail.tsx` yang otomatis muncul ketika user menekan tombol "Daftar".
- Modal berisi `Textarea` doa dengan validasi: minimal ~10 karakter, maksimal 500 karakter. Tombol "Kirim & Daftar" disabled sampai valid.
- Modal **tidak bisa ditutup** dengan klik luar / tombol X / tombol Esc — hanya bisa lewat tombol "Batal" (yang membatalkan pendaftaran) atau "Kirim & Daftar".
- Jika user menekan Batal → tidak jadi terdaftar (tidak ada insert ke `registrations`).
- Jika user submit → doa disimpan ke kolom `registrations.donor_message` bersamaan dengan insert registrasi (baik event free, infaq, maupun paid).
- Untuk event `infaq`/`paid`, user tetap diarahkan ke halaman `/bayar` setelah doa terkirim, dan field donor message di Payment.tsx auto-terisi (readonly / prefilled) supaya tidak perlu isi 2x.
- Berlaku untuk semua tipe pendaftaran (free / infaq / paid), online maupun offline.

## 2. Konfirmasi dua kali saat admin menghapus

**Masalah**: Saat ini menggunakan `window.confirm()` sederhana (Events, Programs, Merchandise, QrisManager, cabut admin di Users).

**Perbaikan**:
- Ganti semua `confirm(...)` di halaman admin dengan komponen `AlertDialog` (shadcn — sudah tersedia di `src/components/ui/alert-dialog.tsx`).
- Dialog akan menampilkan:
  - Judul: **"Yakin ingin menghapus [nama item]?"**
  - Deskripsi: peringatan bahwa aksi tidak dapat dibatalkan + menyebut nama item yang akan dihapus (mis. judul event, nama program).
  - Tombol **Batal** (default) dan **Ya, Hapus** (varian destructive/merah).
- Diterapkan di: `src/pages/admin/Events.tsx` (hapus event), `src/pages/admin/Programs.tsx` (hapus program), `src/pages/admin/Merchandise.tsx`, `src/pages/admin/QrisManager.tsx`, dan `src/pages/admin/Users.tsx` (cabut admin).

## 3. Tombol Scan berubah setelah user berhasil absen

**Masalah**: Di `src/pages/EventDetail.tsx`, tombol "Scan QR Absensi" tetap tampil dengan warna sama meskipun user sudah scan, membingungkan.

**Perbaikan**:
- Variabel `userHasScanned` sudah ada (`!!attendance?.id`).
- Ubah blok tombol scan (baris ~363–382) sehingga jika `userHasScanned === true`:
  - Tombol Scan **disembunyikan**, diganti panel hijau/success dengan ikon centang: **"✓ Kamu sudah absen di event ini"** + timestamp absensi (`attendance.created_at`) + info poin yang didapat.
- Jika belum scan → tombol tetap seperti sekarang (primary, biru).
- Sinkronkan juga `src/pages/ScanQR.tsx` supaya, saat halaman dibuka dan user sudah pernah absen, langsung tampil pesan "Kamu sudah absen" dan tombol Mulai Scan disembunyikan (backup safety).

---

## Catatan teknis singkat

- Tidak ada perubahan skema database — kolom `donor_message` sudah ada di tabel `registrations`.
- Modal doa: gunakan `Dialog` dari shadcn dengan prop `onOpenChange` yang menolak penutupan kecuali via aksi eksplisit.
- Semua perubahan murni frontend.