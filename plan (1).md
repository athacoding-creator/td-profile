# Rencana Perbaikan Fitur Ubah dan Lupa Password

Dokumen ini menguraikan analisis terhadap fitur ubah password di halaman profil dan fitur lupa password di halaman login pada repositori `td-profile`, beserta rencana perbaikan untuk mengatasi masalah yang dilaporkan.

## 1. Fitur Ubah Password (Halaman Profil)

### Masalah yang Dilaporkan
Pengguna melaporkan bahwa fitur ubah password di halaman profil tidak berfungsi sebagaimana mestinya.

### Analisis Kode (`src/pages/Profil.tsx`)
Fitur ubah password diimplementasikan dalam fungsi `changePassword` (baris 182-203) di `Profil.tsx`. Alur kerjanya adalah sebagai berikut:

1.  **Validasi Input:** Memeriksa panjang password baru (minimal 6 karakter) dan kesesuaian antara password baru dengan konfirmasi password baru.
2.  **Verifikasi Password Lama:** Mencoba melakukan `signInWithPassword` ke Supabase menggunakan email sintetis (`${profile.phone}@wa.tdprofile.local`) dan password lama yang dimasukkan pengguna (baris 188-192).
3.  **Pembaruan Password:** Jika verifikasi password lama berhasil, sistem akan memanggil `supabase.auth.updateUser({ password: pw.newPw })` untuk memperbarui password pengguna (baris 197).

**Penyebab Masalah yang Diduga:**
Bagian yang paling mungkin menyebabkan kegagalan adalah langkah verifikasi password lama menggunakan `supabase.auth.signInWithPassword` dengan email sintetis (`@wa.tdprofile.local`). Supabase Auth dirancang untuk bekerja dengan email atau nomor telepon yang valid. Penggunaan domain `.local` pada email sintetis kemungkinan besar tidak dikenali atau tidak didukung oleh sistem autentikasi Supabase untuk tujuan `signInWithPassword`, sehingga verifikasi password lama akan selalu gagal, meskipun password yang dimasukkan benar. Hal ini akan menghasilkan pesan kesalahan "Password lama salah" (baris 195).

### Rencana Perbaikan

1.  **Hapus Verifikasi Password Lama yang Bermasalah:** Hapus atau komentari bagian `signInWithPassword` yang digunakan untuk memverifikasi password lama. Supabase `updateUser` seharusnya sudah cukup aman jika pengguna sudah terautentikasi.
2.  **Implementasi Verifikasi Password Lama yang Aman (Opsional/Lanjutan):** Jika verifikasi password lama mutlak diperlukan untuk alasan keamanan, pertimbangkan untuk mengimplementasikan Supabase Edge Function kustom yang dapat memverifikasi password lama secara aman terhadap hash yang tersimpan, tanpa harus melalui proses `signInWithPassword` yang berpotensi bermasalah dengan email sintetis.

**Prioritas:** Perbaikan ini memiliki prioritas tinggi karena fitur inti tidak berfungsi.

## 2. Fitur Lupa Password (Halaman Login)

### Masalah yang Dilaporkan
Pengguna melaporkan bahwa kode password random tidak langsung terkirim ke nomor WhatsApp yang tertera saat menggunakan fitur lupa password di halaman login.

### Analisis Kode (`src/pages/ForgotPassword.tsx` dan `supabase/functions/reset-password-wa/index.ts`)

1.  **Frontend (`ForgotPassword.tsx`):** Halaman ini mengumpulkan nomor WhatsApp dari pengguna dan memanggil Supabase Edge Function bernama `reset-password-wa` (baris 25-27).
2.  **Backend (Edge Function `reset-password-wa/index.ts`):** Fungsi ini bertanggung jawab untuk:
    *   Menormalisasi nomor telepon (baris 12-19).
    *   Membuat password acak (baris 25-30).
    *   Memperbarui password pengguna di Supabase Auth (baris 86-88).
    *   Memanggil fungsi `sendWhatsApp` untuk mengirim password baru (baris 96).
    *   Menyimpan detail reset password ke tabel `password_resets` (baris 98-104).

**Penyebab Masalah yang Ditemukan:**
Fungsi `sendWhatsApp` (baris 35-50) di dalam Edge Function `reset-password-wa` secara eksplisit mengembalikan `{ ok: false, error: 
"WhatsApp gateway not configured" }` jika `FONNTE_TOKEN` tidak diatur (baris 49). Ini berarti bahwa saat ini tidak ada gateway WhatsApp yang dikonfigurasi untuk mengirim pesan secara otomatis. Password baru memang dibuat dan disimpan di tabel `password_resets`, tetapi tidak dikirimkan ke pengguna melalui WhatsApp.

### Rencana Perbaikan

1.  **Konfigurasi Gateway WhatsApp:** Untuk mengaktifkan pengiriman password baru via WhatsApp secara otomatis, `FONNTE_TOKEN` perlu diatur sebagai *environment variable* di Supabase untuk Edge Function `reset-password-wa`. Pengguna perlu mendapatkan token dari layanan Fonnte atau layanan gateway WhatsApp lainnya yang kompatibel.
2.  **Informasi Pengguna:** Perbarui pesan di frontend (`ForgotPassword.tsx`) untuk lebih jelas menyatakan bahwa password baru akan dikirim melalui WhatsApp *jika gateway telah dikonfigurasi*, atau instruksi alternatif jika belum.

**Prioritas:** Perbaikan ini memiliki prioritas sedang. Fitur dasar (reset password di backend) sudah berfungsi, tetapi pengiriman notifikasi ke pengguna masih manual.

## Kesimpulan

Kedua fitur ini memiliki masalah yang berbeda:

*   **Ubah Password:** Masalah utama kemungkinan besar terletak pada metode verifikasi password lama yang tidak kompatibel dengan sistem Supabase Auth saat menggunakan email sintetis.
*   **Lupa Password:** Masalah utama adalah tidak adanya konfigurasi gateway WhatsApp untuk pengiriman pesan otomatis, sehingga password baru tidak langsung terkirim ke pengguna.

Dengan menerapkan rencana perbaikan di atas, diharapkan kedua fitur ini dapat berfungsi sebagaimana mestinya.
