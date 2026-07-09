
## Tujuan
Mempercepat proses daftar akun & daftar event di tempat. Setelah signup (nama, WA, password, **usia**), user langsung bisa daftar event. Melengkapi data diri opsional, hanya diingatkan lewat popup. Wajib hanya kalau menukar poin merchandise.

## Perubahan

### 1. Database (migration)
- Tambah kolom `age INTEGER` di tabel `profiles`.
- Update trigger `handle_new_user` supaya baca `age` dari metadata signup.
- Kolom profil lain (gender, city, birth_date, address) tetap ada — hanya tidak dipaksa.

### 2. Halaman Signup (`src/pages/Auth.tsx`)
- Tambah field **Usia** (required, angka 5–100) di form signup.
- Kirim `age` di `options.data` saat `signUp()`.
- Setelah signup sukses: redirect ke halaman semula / beranda (bukan lagi ke `/profil`).
- Hapus `sessionStorage.setItem("showProfileCompletionPopup", ...)`.

### 3. Guard rute (`src/components/RequireAuth.tsx`)
- Hapus blok redirect `!profile.gender → /profil`. User boleh akses semua halaman meski profil belum lengkap.

### 4. Halaman Event (`src/pages/Events.tsx` + `EventDetail.tsx`)
- Popup pengingat "Profil belum lengkap" tetap ada di `Events.tsx` (sudah terpasang) — tetap opsional, tombol "Nanti" & "Lengkapi Data".
- Tambahkan popup pengingat serupa di `EventDetail.tsx` saat user membuka detail event (sekali per sesi) — biar user selalu diingatkan tapi tidak diblokir.
- Alur daftar event (free / paid / infaq) tidak lagi memeriksa `is_complete`.

### 5. Halaman Poin (`src/pages/Poin.tsx`)
- Guard `redeem()` yang cek `profile.is_complete` **tetap dipertahankan** (sudah ada) — user diarahkan ke `/profil` sebelum tukar merchandise.
- Tambah banner peringatan di atas daftar reward: "Untuk menukar poin, lengkapi data diri dulu" bila `!is_complete`.

### 6. Halaman Profil (`src/pages/Profil.tsx`)
- Tampilkan field **Usia** (bisa diedit).
- Ubah wording: "Data diri opsional, tapi **wajib** kalau mau tukar poin merchandise".
- Tetap simpan bonus poin saat profil lengkap 100%.

## Yang TIDAK berubah
- Skema poin & bonus profil lengkap.
- Alur pembayaran, scan QR, infaq.
- Fungsi admin.

## Catatan teknis
- Migration `age` sudah dijalankan pada langkah sebelumnya — aman dilanjutkan.
- Build error di `AttendanceQR.tsx` tidak terkait scope ini; halaman itu masih tersembunyi ("dalam pengembangan"). Akan diperbaiki singkat: hapus opsi `quality` dari `QRCode.toDataURL()` dan `await` promise-nya, atau `// @ts-nocheck` file tersebut.
