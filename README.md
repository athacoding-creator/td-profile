# Teras Dakwah Profile - Platform Tiket Kajian

Sebuah platform web komprehensif untuk manajemen pendaftaran, tiket, dan kehadiran acara Islami seperti kajian, *talkshow*, dan *healing session*. Aplikasi ini dirancang untuk memberikan pengalaman yang mulus bagi peserta dalam mencari event dan bagi admin dalam mengelola operasional acara.

## 🚀 Fitur Utama

### 👤 Halaman Pengguna (Peserta)
- **Eksplorasi & Pendaftaran Event:** Menampilkan daftar acara terbaru dengan dukungan filter otomatis berdasarkan gender (pemisahan akses Ikhwan/Akhwat).
- **Sistem Kehadiran QR Code:** Peserta dapat melakukan *check-in* di lokasi acara secara mandiri menggunakan fitur pemindai QR Code bawaan.
- **Sistem Poin & *Reward*:** Peserta mendapatkan poin dari aktivitas (seperti kehadiran) yang nantinya dapat ditukarkan dengan *merchandise*.
- **Riwayat & Arsip:** Melacak acara yang pernah diikuti serta melihat arsip acara yang sudah lewat.
- **Onboarding & Profil:** Manajemen data diri peserta secara mandiri.

### 🛡️ Dashboard Admin
- **Statistik Real-time:** Memantau pengguna yang sedang online, login harian, acara aktif, dan jumlah pendaftar.
- **Manajemen Event & Program:** Membuat, mengedit, dan mengatur status acara serta program.
- **Manajemen Pendaftar:** Memantau dan mengelola data peserta yang mendaftar pada setiap event.
- **Sistem Penukaran (Redemption):** Memverifikasi dan memproses penukaran poin peserta dengan *merchandise*.
- **Log Aktivitas:** Memantau riwayat login dan aktivitas terbaru di dalam platform.

## 🛠️ Tech Stack (Teknologi yang Digunakan)

Aplikasi ini dibangun menggunakan ekosistem modern untuk menjamin performa dan kemudahan pengembangan:
- **Framework:** [React 18](https://react.dev/) dengan [TypeScript](https://www.typescriptlang.org/) 
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Routing:** [React Router DOM](https://reactrouter.com/) (termasuk proteksi rute untuk otentikasi dan hak akses Admin)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Komponen UI:** [Shadcn UI](https://ui.shadcn.com/) & [Radix UI](https://www.radix-ui.com/)
- **Backend as a Service (BaaS):** [Supabase](https://supabase.com/) (Autentikasi & Database)
- **State Management:** [TanStack React Query](https://tanstack.com/query/latest)
- **QR Scanner:** `html5-qrcode` & `qrcode`

![License](https://img.shields.io/badge/license-MIT-green.svg) ![Status](https://img.shields.io/badge/status-active-success.svg)

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-%23181818.svg?style=for-the-badge&logo=supabase&logoColor=%233ECF8E)

## 💻 Cara Menjalankan Proyek (Local Development)

Ikuti langkah-langkah berikut untuk menjalankan aplikasi ini di komputer Anda:

## 1. Clone repositori ini
     ```bash
     git clone <url-repo-anda>
     cd <nama-folder>

## 2. Instalasi Dependensi
  Anda bisa menggunakan npm, yarn, atau bun.
  
     npm install
     
  ### atau jika menggunakan bun
     
     bun install
  
  ## 3. Konfigurasi Environment Variables
  Buat file .env di root directory dan tambahkan kredensial Supabase Anda:

  Cuplikan kode
     
     VITE_SUPABASE_URL=url_project_supabase_anda
     VITE_SUPABASE_ANON_KEY=anon_key_supabase_anda
     
## 4. Jalankan Development Server

    ```Bash
    npm run dev
    Aplikasi akan berjalan di http://localhost:5173.

## 5. 📁 Struktur Proyek

Proyek ini disusun dengan arsitektur standar aplikasi React (Vite) yang terintegrasi dengan Supabase dan komponen UI Shadcn.

```text
📦 teras-dakwah-profile
├── 📂 public/               # Aset statis publik yang dapat diakses langsung
│   ├── 📂 events/           # Kumpulan gambar/poster event (event-1.jpg, dll)
│   ├── favicon.ico          # Ikon website
│   ├── placeholder.svg      # Gambar placeholder bawaan
│   └── robots.txt           # Konfigurasi crawler mesin pencari
│
├── 📂 src/                  # Kode sumber utama aplikasi React
│   ├── 📂 assets/           # Aset internal untuk di-import ke dalam komponen (gambar event, dll)
│   ├── 📂 components/       # Komponen React yang dapat digunakan ulang (Reusable)
│   │   ├── 📂 ui/           # Komponen dasar dari Shadcn UI (button, dialog, card, dll)
│   │   ├── BottomNav.tsx    # Navigasi bawah untuk versi mobile
│   │   ├── Header.tsx       # Komponen Header/Navbar utama
│   │   ├── NavLink.tsx      # Komponen tautan kustom
│   │   └── RequireAuth.tsx  # Wrapper (HOC) untuk proteksi halaman (hanya user login/admin)
│   │
│   ├── 📂 hooks/            # Custom React Hooks
│   │   ├── use-mobile.tsx   # Hook pendeteksi layar mobile
│   │   ├── use-toast.ts     # Hook untuk menampilkan notifikasi (toast)
│   │   └── useAuth.tsx      # Hook sentral untuk state autentikasi dan profil user
│   │
│   ├── 📂 integrations/     # Konfigurasi layanan pihak ketiga
│   │   └── 📂 supabase/     
│   │       ├── client.ts    # Inisialisasi koneksi ke Supabase
│   │       └── types.ts     # Definisi tipe data TypeScript untuk database Supabase
│   │
│   ├── 📂 lib/              # Fungsi utilitas (Helpers)
│   │   └── utils.ts         # Fungsi bantuan (seperti class-merger tailwind `cn`)
│   │
│   ├── 📂 pages/            # Komponen halaman (Routes)
│   │   ├── 📂 admin/        # Kumpulan halaman khusus Dashboard Admin
│   │   │   ├── AdminLayout.tsx, Dashboard.tsx, Events.tsx, Logins.tsx, Merchandise.tsx, 
│   │   │   ├── Programs.tsx, Redemptions.tsx, Registrations.tsx, Scan.tsx, Settings.tsx,
│   │   │   └── useAdminData.ts
│   │   ├── Archive.tsx      # Halaman arsip event lampau
│   │   ├── Auth.tsx         # Halaman Login/Register
│   │   ├── EventDetail.tsx  # Halaman detail sebuah event
│   │   ├── Index.tsx        # Halaman utama (Beranda)
│   │   ├── NotFound.tsx     # Halaman error 404
│   │   ├── Onboarding.tsx   # Halaman kelengkapan data diri user baru
│   │   ├── Poin.tsx         # Halaman informasi poin user
│   │   ├── Profil.tsx       # Halaman profil user
│   │   ├── Riwayat.tsx      # Halaman riwayat event yang diikuti
│   │   └── ScanQR.tsx       # Halaman pemindai tiket QR Code
│   │
│   ├── 📂 test/             # File pengujian (Unit Testing) dengan Vitest
│   │   ├── example.test.ts  
│   │   └── setup.ts         
│   │
│   ├── App.tsx              # Komponen utama yang berisi routing aplikasi (React Router)
│   ├── index.css / App.css  # Styling global (Tailwind directives)
│   ├── main.tsx             # Entry point utama aplikasi React
│   └── vite-env.d.ts        # Definisi environment variabel Vite
│
├── 📂 supabase/             # Konfigurasi lokal dan migrasi database Supabase
│   ├── config.toml          # File konfigurasi lokal Supabase
│   └── 📂 migrations/       # Kumpulan file SQL untuk membangun skema database
│
├── .env                     # File environment variables (seperti API Key, jangan di-commit)
├── components.json          # Konfigurasi Shadcn UI CLI
├── eslint.config.js         # Konfigurasi Linter kode (ESLint)
├── index.html               # File HTML utama (Template)
├── package.json             # Daftar dependensi (packages) dan script project
├── tailwind.config.ts       # Konfigurasi styling framework Tailwind CSS
├── tsconfig.json            # Konfigurasi utama TypeScript
├── vite.config.ts           # Konfigurasi bundler Vite
└── vitest.config.ts         # Konfigurasi test runner Vitest
```

# 🤝 Kontribusi
Kontribusi sangat diterima! Silakan fork repository ini dan buat Pull Request untuk fitur baru atau perbaikan bug.

Fork Project

Buat Feature Branch 

    (git checkout -b feature/DakwahIslamic)

Commit Changes 

    (git commit -m 'Menambahkan DakwahIslamic')

Push ke Branch 

    (git push origin feature/DakwahIslamic)

Buka Pull Request
