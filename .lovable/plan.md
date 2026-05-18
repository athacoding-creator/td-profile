## Masalah

Saat daftar, Supabase menolak dengan error:
> Email address "6282241590417@wa.tdprofile.local" is invalid

Penyebab: Supabase Auth sekarang memvalidasi domain email lebih ketat. TLD `.local` ditolak karena bukan TLD publik yang valid. Sebelumnya bisa lewat, sekarang diblokir.

## Solusi

Ganti domain email sintetik dari `@wa.tdprofile.local` → `@wa.tdprofile.app` (TLD `.app` valid & diterima Supabase). Email ini tetap hanya dipakai internal untuk login berbasis nomor WA — user tidak pernah melihatnya.

## Perubahan kode

**`src/lib/phone.ts`**
- `phoneToEmail`: return `${phone}@wa.tdprofile.app`
- `emailToPhone`: regex disesuaikan ke domain baru, dengan fallback ke domain lama `.local` agar user lama tetap bisa di-decode di UI admin.

## Migrasi user lama

User yang sudah terdaftar dengan `@wa.tdprofile.local` tetap bisa login karena email mereka di `auth.users` tidak berubah — Supabase hanya memvalidasi domain saat **signup baru**, bukan saat sign-in. Jadi:
- User lama → login tetap jalan (pakai email lama di DB).
- User baru → daftar pakai domain `.app` yang valid.

Tidak perlu migrasi DB.

## Verifikasi

1. Coba daftar dengan nomor baru → harus sukses.
2. Login user lama (admin `6285111514040`) → harus tetap bisa masuk.
3. Cek tampilan nomor WA di profil & admin → masih ter-format benar.