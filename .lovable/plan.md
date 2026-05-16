## Tujuan

Ganti login Email/Gmail jadi login **No. WhatsApp + Password**. Nomor WA jadi identitas unik tiap user. Lupa password → kirim password acak ke WhatsApp user, user bisa ganti sendiri dari Profil.

---

## Pendekatan teknis (penting dipahami)

Supabase Auth tidak punya tipe "phone+password tanpa SMS" yang bisa pakai gateway WA pihak ketiga secara native. Solusi paling stabil & cepat: **pakai sistem email Supabase yang sudah ada, tapi email-nya kita bikin sintetis dari nomor WA**, misalnya:

```
628123456789@wa.tdprofile.local
```

User TIDAK pernah melihat email ini. Di UI mereka hanya isi **No WhatsApp + Password**. Frontend yang mengubah nomor → email sintetis sebelum dikirim ke Supabase.

Keuntungan:
- Tidak perlu provider SMS Supabase (mahal & ribet untuk Indonesia).
- Password tetap di-hash & dikelola Supabase Auth (aman).
- Reset password bisa kita kontrol sendiri via Edge Function + WhatsApp gateway.
- `auth.users.id` (UUID) tetap jadi primary key — semua tabel existing (`profiles`, `registrations`, `attendance`, dst) tidak berubah strukturnya.

---

## Cakupan perubahan

### 1. Bersihkan data lama (Anda pilih "Mulai bersih")

Migration: hapus semua user dari `auth.users` (cascade akan menghapus `profiles`, `user_roles`, `registrations`, `attendance`, `point_transactions`, `redemptions`, `login_events`). Admin pertama harus didaftarkan ulang setelah ini — kita siapkan 1 akun admin seed via nomor WA Anda.

### 2. Schema database

- Tambah kolom **`phone` UNIQUE NOT NULL** di `profiles` (normalisasi ke 628xxx).
- Update trigger `handle_new_user` supaya baca nomor WA dari metadata signup dan simpan ke `profiles.phone`.
- Update trigger `check_profile_complete` — `phone` sudah selalu terisi sejak daftar, jadi tidak perlu diisi lagi di Profil (field phone di form Profil jadi read-only).
- Index unik di `profiles.phone` agar tidak bisa ada nomor WA duplikat.

### 3. Halaman Auth (`src/pages/Auth.tsx`)

- Hapus field Email & Gmail.
- Form Daftar: **Nama Lengkap, No. WhatsApp, Password**.
- Form Masuk: **No. WhatsApp, Password**.
- Tambah link "Lupa password?" → halaman baru `/forgot-password`.
- Helper `normalizePhone()`: `08xxx` / `+628xxx` / `8xxx` → `628xxx`. Validasi panjang 10–15 digit.
- `phoneToEmail(phone)` → `${phone}@wa.tdprofile.local` (dipakai untuk signUp / signInWithPassword).
- Error mapping: kalau Supabase return "User already registered" → tampilkan "Nomor WhatsApp sudah terdaftar".

### 4. Halaman baru `/forgot-password`

- Input: No. WhatsApp.
- Submit → panggil Edge Function `reset-password-wa` (lihat #6).
- Tampilkan: "Password baru sudah dikirim ke WhatsApp Anda. Cek pesan, lalu masuk dan ubah password dari menu Profil."

### 5. Halaman Profil (`src/pages/Profil.tsx`)

- Field **No. WhatsApp jadi read-only** (tidak bisa diubah dari sini — nomor = identitas login).
- Tambah menu baru: **"Ubah Password"** → form: password lama, password baru, konfirmasi. Pakai `supabase.auth.updateUser({ password })` setelah re-verifikasi password lama via sign-in ulang.
- Hapus tampilan "email" (karena email sintetis, tidak ada artinya untuk user). Tampilkan nomor WA sebagai identitas akun.

### 6. Edge Function `reset-password-wa`

Input: `{ phone }` (akan dinormalisasi server-side).

Alur:
1. Validasi format nomor (Zod).
2. Cari user via service role: `SELECT id FROM profiles WHERE phone = ?`.
3. Jika tidak ada → tetap return sukses (anti-enumeration), tidak kirim apa-apa.
4. Generate password acak 8 karakter alfanumerik.
5. `supabaseAdmin.auth.admin.updateUserById(id, { password: newPass })`.
6. Kirim WhatsApp ke nomor user via gateway (Fonnte / Wablas / Twilio — **pluggable**, gateway dipilih nanti).
7. Catat event di tabel baru `password_resets` (audit: user_id, created_at, ip).

Karena Anda belum menentukan gateway, function akan dibuat dengan **adapter pattern**: ada fungsi `sendWhatsApp(phone, message)` di-stub dulu (log ke console + masukkan ke tabel `password_resets` dengan kolom `message`). Begitu Anda kasih tahu gateway-nya, tinggal isi adapter itu — tidak perlu refactor besar.

### 7. Hapus Onboarding gender? 

Onboarding gender tetap dipertahankan (tidak terkait auth). Tapi karena `phone` sudah terisi otomatis dari signup, profil cuma butuh: gender, kota, tanggal lahir, alamat → bonus poin tetap berfungsi.

### 8. Admin dashboard

- Halaman Pendaftar/Profil user: tampilkan No WhatsApp lebih prominen + tombol "Hubungi via WA" (link `https://wa.me/{phone}`).
- Tidak ada perubahan major lain — export Excel sudah pakai phone (sudah diperbaiki di iterasi sebelumnya).

### 9. Update `useAuth.tsx`

- Profile type sudah punya `phone` — tinggal pastikan `email` tidak ditampilkan di UI manapun (atau tampilkan nomor WA).

---

## Pertimbangan penting yang harus Anda setujui

1. **"Mulai bersih" = SEMUA akun, poin, registrasi, kehadiran terhapus.** Tidak bisa di-rollback. Pastikan ini bukan database produksi yang sudah ada datanya berharga.
2. **Password acak akan terkirim ke WA dalam plaintext** — itu memang standar untuk reset flow. User wajib ganti setelah login.
3. Gateway WA belum dipilih → function reset password akan **menyimpan password baru ke tabel `password_resets`** sebagai placeholder. Anda bisa baca dari sana sementara untuk testing, atau bilang ke saya nanti gatewaynya supaya saya pasang adapternya.
4. Akun **admin pertama** setelah wipe: kasih tahu saya nomor WA yang mau dijadikan admin — saya seed di migration.

---

## Urutan eksekusi

1. Migration: wipe users, tambah `phone` unique di `profiles`, update trigger, buat tabel `password_resets`, seed admin.
2. Edit `Auth.tsx` + helper normalisasi nomor.
3. Buat `/forgot-password`.
4. Update `Profil.tsx` (phone read-only, menu Ubah Password, hilangkan email).
5. Edge Function `reset-password-wa` dengan stub gateway.
6. Update routing di `App.tsx`.
7. Sentuhan kecil di admin (tombol WhatsApp).

Saya butuh konfirmasi Anda untuk **3 hal di atas** (terutama wipe data & nomor admin) sebelum mulai eksekusi.