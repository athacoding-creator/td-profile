# Lokasi sesuai negara + Bahasa Indonesia/English

## 1. Lokasi sesuai negara (Ubah data akun)
- Tambah pilihan **Negara** paling atas (daftar semua negara, default otomatis dari kode nomor WA user, mis. +60 → Malaysia, +81 → Jepang).
- Jika **Indonesia**: tetap pakai Provinsi → Kab/Kota → Kecamatan seperti sekarang.
- Jika negara lain: kolom isian bebas **Provinsi/Negara bagian** dan **Kota**, kecamatan disembunyikan.
- Syarat profil lengkap (untuk tukar poin) menyesuaikan: luar negeri cukup negara + kota.

## 2. Bahasa Indonesia / English
- Tombol pilih bahasa (ID / EN) di halaman Profil, di samping tombol light/dark. Pilihan disimpan di perangkat.
- Default: Indonesia; pengunjung dengan browser berbahasa non-Indonesia otomatis English.
- Yang diterjemahkan: menu bawah, header, Masuk/Daftar, Lupa Password, Beranda, Daftar Event, Detail Event, Pembayaran, Riwayat, Poin, Profil, halaman Scan & Sukses.
- Dashboard admin tetap Bahasa Indonesia. Judul/deskripsi event yang ditulis admin tidak diterjemahkan otomatis.

## Detail teknis
- Migrasi: kolom `country_code`, `country_name` di `profiles`; update trigger `check_profile_complete` (ID butuh province/regency, non-ID butuh country + city).
- File `src/data/countries.json` (ISO + nama + kode telepon); helper tebak negara dari `phone`.
- `src/i18n/` : context `LanguageProvider` + hook `useT()` dengan kamus `id.ts` / `en.ts`, disimpan di localStorage; halaman di atas diganti ke `t("key")`.
