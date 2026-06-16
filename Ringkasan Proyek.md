# Ringkasan Proyek: td-profile

Dokumen ini menyediakan ringkasan komprehensif mengenai proyek `td-profile`, yang dirancang untuk membantu anggota tim baru dalam memahami tujuan, teknologi, struktur, dan aliran data aplikasi. Proyek ini merupakan platform manajemen acara dan komunitas yang berfokus pada acara keagamaan, memungkinkan pengguna untuk mendaftar, membayar, dan mencatat kehadiran dalam berbagai acara.

## 1. Tentang Proyek

Proyek `td-profile` adalah sebuah aplikasi web yang berfungsi sebagai platform untuk mengelola dan berpartisipasi dalam acara, khususnya kajian keagamaan. Aplikasi ini mendukung berbagai fitur baik untuk pengguna umum maupun administrator:

*   **Pengguna Umum**: Dapat melihat daftar acara, mendaftar (gratis, berbayar, atau infaq), melakukan pembayaran, memindai QR untuk kehadiran, melihat riwayat partisipasi, dan mengelola profil.
*   **Administrator**: Memiliki dashboard untuk mengelola acara, program, pendaftar, verifikasi pembayaran, manajemen QRIS, merchandise, dan pengaturan aplikasi.

Fokus utama aplikasi ini adalah menyederhanakan proses pendaftaran dan kehadiran acara, serta menyediakan sistem poin dan fitur komunitas.

## 2. Teknologi yang Digunakan

Proyek ini dibangun menggunakan tumpukan teknologi modern yang berpusat pada pengembangan web _front-end_ dan _back-end_ tanpa server:

| Kategori | Teknologi | Deskripsi |
| :------- | :-------- | :---------- |
| **Front-end** | **React.js** | Pustaka JavaScript untuk membangun antarmuka pengguna interaktif. |
| | **TypeScript** | Superset JavaScript yang menambahkan penulisan statis, meningkatkan skalabilitas dan pemeliharaan kode. |
| | **Vite** | _Build tool_ cepat untuk pengembangan _front-end_, menyediakan _hot module replacement_ (HMR) dan _bundling_ yang efisien. |
| | **Tailwind CSS** | _Framework_ CSS _utility-first_ untuk membangun desain kustom dengan cepat. |
| | **Shadcn/Radix UI** | Kumpulan komponen UI yang dapat diakses dan dapat disesuaikan, dibangun di atas Radix UI dan ditata dengan Tailwind CSS. |
| | **React Router DOM** | Pustaka untuk manajemen _routing_ di aplikasi React. |
| | **@tanstack/react-query** | Pustaka untuk _fetching_, _caching_, dan _updating_ data asinkron di React. |
| **Back-end & Database** | **Supabase** | _Platform open-source_ yang menyediakan _backend-as-a-service_ (BaaS) termasuk database PostgreSQL, autentikasi, penyimpanan file, dan _realtime subscriptions_. |
| | **PostgreSQL** | Sistem manajemen basis data relasional yang digunakan oleh Supabase. |
| | **Supabase Edge Functions** | Fungsi _serverless_ yang di-deploy di _edge_ untuk logika _backend_ kustom (misalnya, reset password via WhatsApp). |
| **Lain-lain** | **ESLint** | Alat _linting_ kode untuk menjaga kualitas dan konsistensi kode. |
| | **Vitest** | _Framework_ pengujian unit dan komponen yang cepat. |
| | **Vercel Analytics** | Untuk melacak metrik penggunaan aplikasi. |

## 3. Struktur Proyek

Berikut adalah gambaran umum struktur direktori utama proyek:

```
. 
├── public/ 
├── scripts/ 
├── src/ 
│   ├── components/ 
│   ├── hooks/ 
│   ├── integrations/ 
│   ├── lib/ 
│   ├── pages/ 
│   ├── utils/ 
│   └── ... 
├── supabase/ 
│   ├── functions/ 
│   └── migrations/ 
└── ... 
```

## 4. Penjelasan Setiap Folder dan Fungsi File Utama

### `public/`
Berisi aset statis seperti ikon aplikasi, _manifest_ PWA, _placeholder_ gambar, dan file konfigurasi seperti `robots.txt` dan `sitemap.xml`.

### `scripts/`
Berisi _script_ utilitas, misalnya `generate-sitemap.js` untuk menghasilkan _sitemap_ situs.

### `src/`
Direktori utama untuk kode sumber _front-end_ aplikasi.

*   **`src/App.tsx`**: File utama yang mendefinisikan _routing_ aplikasi menggunakan `react-router-dom`. Ini adalah titik masuk untuk semua halaman dan mengatur _layout_ dasar, termasuk _provider_ untuk autentikasi, tema, _query client_, dan _analytics_. Terdapat rute untuk pengguna umum dan rute khusus `/admin` yang dilindungi oleh `RequireAuth`.
*   **`src/main.tsx`**: Titik _entry_ aplikasi React, yang me-render komponen `App` ke dalam DOM.
*   **`src/components/`**: Berisi komponen UI yang dapat digunakan kembali di seluruh aplikasi. Contoh penting:
    *   **`Header.tsx` & `BottomNav.tsx`**: Komponen navigasi utama.
    *   **`RequireAuth.tsx`**: Komponen _wrapper_ untuk melindungi rute yang memerlukan autentikasi atau peran admin.
    *   **`ui/`**: Komponen UI generik yang berasal dari Shadcn/Radix UI (misalnya, `button.tsx`, `input.tsx`, `dialog.tsx`).
    *   **`YoutubeEmbed.tsx`**: Komponen untuk menampilkan video YouTube.
    *   **`DonorWall.tsx`**: Komponen untuk menampilkan daftar donatur.
*   **`src/hooks/`**: Berisi _custom hooks_ React untuk logika yang dapat digunakan kembali.
    *   **`useAuth.tsx`**: _Hook_ utama untuk manajemen autentikasi dan profil pengguna dengan Supabase. Ini menyediakan konteks pengguna, sesi, profil, status admin, dan fungsi _sign out_.
*   **`src/integrations/`**: Berisi kode untuk berinteraksi dengan layanan eksternal.
    *   **`supabase/client.ts`**: Menginisialisasi klien Supabase dengan URL dan kunci API yang dikonfigurasi. Ini adalah jembatan utama untuk berinteraksi dengan _backend_ Supabase.
    *   **`supabase/types.ts`**: File yang dihasilkan secara otomatis yang mendefinisikan _interface_ TypeScript untuk skema database Supabase, membantu dalam _type-checking_ dan pengembangan.
*   **`src/lib/`**: Berisi _utility functions_ atau pustaka kecil.
    *   **`eventSchedule.ts`**: Logika untuk menghitung status acara (berulang, kedaluwarsa) dan jendela _scan_ kehadiran.
    *   **`qrUrl.ts`**: _Utility_ untuk membuat dan mengurai URL QR.
*   **`src/pages/`**: Berisi komponen halaman utama aplikasi.
    *   **`Index.tsx`**: Halaman beranda yang menampilkan daftar acara.
    *   **`Auth.tsx`**: Halaman untuk proses _login_ dan _registrasi_ pengguna.
    *   **`EventDetail.tsx`**: Halaman detail acara, memungkinkan pengguna untuk mendaftar, melihat informasi acara, dan melakukan pembayaran. Ini adalah salah satu file paling sentral untuk aliran data pengguna.
    *   **`Payment.tsx`**: Halaman untuk mengunggah bukti pembayaran atau berinfaq setelah pendaftaran acara.
    *   **`ScanQR.tsx`**: Halaman untuk memindai kode QR kehadiran dari dalam aplikasi.
    *   **`ScanLanding.tsx`**: Halaman perantara untuk memproses _scan_ QR dari tautan eksternal.
    *   **`admin/`**: Direktori untuk halaman-halaman _dashboard_ admin.
        *   **`admin/AdminLayout.tsx`**: _Layout_ dasar untuk semua halaman admin, termasuk navigasi _sidebar_.
        *   **`admin/Dashboard.tsx`**: Halaman _dashboard_ utama admin.
        *   **`admin/useAdminData.ts`**: _Hook_ yang mengagregasi data dari berbagai tabel Supabase untuk digunakan di seluruh _dashboard_ admin, termasuk _realtime subscriptions_.
        *   **`admin/Donations.tsx`**: Halaman untuk admin memverifikasi pembayaran dan donasi.
*   **`src/utils/`**: Berisi _utility functions_ umum.
    *   **`pointReasons.ts`**: Mendefinisikan label untuk alasan perolehan poin.

### `supabase/`
Direktori ini berisi konfigurasi dan _script_ terkait Supabase.

*   **`supabase/functions/`**: Berisi _Supabase Edge Functions_.
    *   **`reset-password-wa/index.ts`**: Fungsi _serverless_ untuk proses _reset password_ melalui WhatsApp.
*   **`supabase/migrations/`**: Berisi _script_ migrasi SQL untuk skema database PostgreSQL. File-file ini sangat penting untuk memahami struktur database dan logika _backend_.
    *   **`20260606000001_fix_infaq_attendance.sql`**: Mendefinisikan fungsi `public.record_attendance` yang merupakan inti dari logika pencatatan kehadiran. Fungsi ini memvalidasi pengguna, acara, status pembayaran/pendaftaran, dan jendela waktu _scan_ sebelum mencatat kehadiran.
    *   **`20260531000002_final_fix.sql`**: Migrasi yang berkaitan dengan _Role-Based Access Control_ (RBAC) dan fungsi _QR generation_ untuk admin.
    *   **`20260601000003_payment_flow_enhancements.sql`**: Migrasi yang mengatur _bucket storage_ untuk bukti pembayaran dan menambahkan kolom terkait pembayaran ke tabel `registrations`.

## 5. Aliran Data

Aliran data dalam proyek `td-profile` berpusat pada interaksi pengguna dengan acara dan manajemen data melalui Supabase. Berikut adalah gambaran umum aliran data utama:

### 5.1. Autentikasi dan Profil Pengguna
1.  **Login/Registrasi**: Pengguna berinteraksi dengan `Auth.tsx` untuk _login_ atau _registrasi_. Permintaan ini dikirim ke Supabase Auth.
2.  **Manajemen Sesi**: `useAuth.tsx` mendengarkan perubahan status autentikasi dari Supabase. Setelah _login_, Supabase mengembalikan sesi dan data pengguna.
3.  **Data Profil**: `useAuth.tsx` kemudian mengambil data profil tambahan dari tabel `profiles` di Supabase dan peran pengguna dari `user_roles`.
4.  **Proteksi Rute**: `RequireAuth.tsx` menggunakan informasi dari `useAuth.tsx` untuk melindungi rute. Jika pengguna belum _login_ atau profil belum lengkap, mereka akan diarahkan ke halaman yang sesuai (`/auth` atau `/profil`).

### 5.2. Pendaftaran dan Pembayaran Acara
1.  **Melihat Acara**: Pengguna melihat daftar acara di `Index.tsx` atau detail acara di `EventDetail.tsx`. Data acara diambil dari tabel `events` di Supabase.
2.  **Pendaftaran**: Di `EventDetail.tsx`, ketika pengguna mengklik tombol daftar:
    *   Validasi dilakukan (misalnya, kelengkapan profil, jenis kelamin). Jika event _online_, pengguna dapat memilih mode kehadiran (_online_/_offline_).
    *   Data pendaftaran (`event_id`, `user_id`, `payment_status`, `amount_paid`, `attendance_mode`) dimasukkan ke tabel `registrations` di Supabase.
    *   Untuk acara berbayar atau infaq, pengguna diarahkan ke `Payment.tsx`.
3.  **Pembayaran/Infaq**: Di `Payment.tsx`:
    *   Pengguna mengunggah bukti pembayaran (gambar) yang kemudian dikonversi ke format WEBP dan diunggah ke _bucket storage_ `payment_proofs` di Supabase.
    *   URL bukti pembayaran dan status pembayaran (`pending`) diperbarui di tabel `registrations`.
    *   Admin akan memverifikasi pembayaran melalui `admin/Donations.tsx`.

### 5.3. Pencatatan Kehadiran (Scan QR)
1.  **Scan QR (dari luar aplikasi)**: Pengguna memindai QR dari kamera HP yang mengarah ke `ScanLanding.tsx`.
    *   `ScanLanding.tsx` memproses token QR, memvalidasi pengguna, dan memanggil fungsi `public.record_attendance` di Supabase.
2.  **Scan QR (dari dalam aplikasi)**: Pengguna membuka `ScanQR.tsx` untuk memindai QR.
    *   `ScanQR.tsx` menggunakan kamera perangkat untuk membaca QR dan kemudian memanggil fungsi `public.record_attendance` di Supabase.
3.  **Logika Backend Kehadiran**: Fungsi `public.record_attendance` (didefinisikan di `supabase/migrations/20260606000001_fix_infaq_attendance.sql`) adalah inti dari proses ini:
    *   Memvalidasi token QR dan `event_id`.
    *   Memeriksa apakah pengguna sudah terdaftar di acara tersebut (dari tabel `registrations`).
    *   Untuk acara berbayar, memverifikasi `payment_status` harus `approved`. Untuk infaq, tidak memerlukan verifikasi admin.
    *   Memeriksa jendela waktu _scan_ berdasarkan `starts_at`, `ends_at`, dan konfigurasi acara berulang.
    *   Jika semua validasi berhasil, data kehadiran dimasukkan ke tabel `attendance` dan `registrations` diperbarui (jika belum ada).

### 5.4. Dashboard Admin
1.  **Akses Admin**: Pengguna dengan peran `admin` dapat mengakses rute `/admin` yang dilindungi oleh `RequireAuth`.
2.  **Data Dashboard**: `admin/useAdminData.ts` mengambil data dari berbagai tabel Supabase (`events`, `programs`, `registrations`, `attendance`, dll.) untuk mengisi _dashboard_.
3.  **Realtime Updates**: `useAdminData.ts` juga berlangganan _realtime subscriptions_ dari Supabase untuk tabel-tabel penting, memastikan _dashboard_ admin selalu menampilkan data terbaru.
4.  **Verifikasi Pembayaran**: Di `admin/Donations.tsx`, admin dapat mengubah `payment_status` di tabel `registrations` menjadi `approved` atau `rejected`.

---
