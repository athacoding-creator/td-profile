# Perbaikan Scan QR + Halaman Download App

## 1. Fix Scan QR (white screen / force close)

### Penyebab yang ditemukan di `src/pages/ScanLanding.tsx`
- **Race condition profil**: `useEffect` jalan saat `loading=false` tapi `profile` masih `null` (belum sempat ter-fetch). Cek `profile && !profile.is_complete` di-skip, lalu langsung memanggil `record_attendance`. Saat profil akhirnya datang dan komponen re-render, guard `ran.current` mencegah retry → layar putih.
- **Tidak ada error boundary**: kalau `refreshProfile()` atau RPC melempar exception non-PostgrestError (mis. network drop / token refresh expired seperti log `refresh_token_not_found`), tidak ada `try/catch` → komponen crash → blank screen / force close di WebView.
- **Tidak ada try/catch di seluruh effect** — error apapun di pertengahan flow membuat state `error` tidak ter-set.
- **`ran.current`** mengunci proses; kalau gagal di tengah jalan, refresh memang menampilkan sukses karena attendance sudah tercatat di percobaan pertama, tapi UI yang pertama tidak pernah navigate.

### Perbaikan
1. **Tunggu profil benar-benar siap** sebelum lanjut: `if (loading || (user && !profile)) return;` — jangan jalan tanpa profil.
2. **Bungkus seluruh async flow dengan `try/catch/finally`**. Setiap throw → `setError(friendlyMessage)`, jangan biarkan promise reject menyebabkan blank screen.
3. **Pindahkan `await refreshProfile()` ke dalam try/catch terpisah** dan jangan blokir navigasi kalau gagal — attendance sudah berhasil, cukup navigate ke halaman sukses lalu refresh profil di background.
4. **Reset `ran.current = false` saat error** supaya user bisa retry tanpa harus reload manual; tambah tombol "Coba lagi" yang re-trigger effect.
5. **Tampilkan loading state yang aman** saat profil belum siap (sudah ada, tapi pastikan tidak lompat ke error).
6. **Optional safety**: tambah `<ErrorBoundary>` ringan di `App.tsx` Suspense fallback supaya crash sub-tree tidak menampilkan white screen total.

### File yang diubah
- `src/pages/ScanLanding.tsx` — rewrite effect dengan guard profil + try/catch + retry.
- (Opsional) `src/components/ErrorBoundary.tsx` baru + dipakai membungkus `<Routes>` di `src/App.tsx`.

---

## 2. Halaman Download App (di Profil)

### Lokasi
- Tambah menu baru "Download Aplikasi" di list menu Profil (`src/pages/Profil.tsx`) dengan ikon `Download`.
- Route baru `/profil/download` → halaman baru `src/pages/DownloadApp.tsx`.

### Isi halaman (bahasa awam, banyak gambar/ikon)
- **Tombol utama "Install Aplikasi"** (PWA install). Pakai event `beforeinstallprompt`:
  - Simpan ke state, klik tombol → `prompt()`.
  - Kalau browser tidak support / sudah terinstall → tampilkan instruksi manual sesuai device.
- **Tab/Accordion 3 panduan** dengan langkah bergambar sederhana:
  - **Android (Chrome)** — buka di Chrome → titik 3 → "Tambahkan ke layar Utama" → "Install".
  - **iPhone / iPad (Safari)** — buka di Safari → ikon Share → "Tambahkan ke Layar Utama" → "Tambah".
  - **Windows / Laptop (Chrome/Edge)** — ikon install di address bar → "Install".
- **Catatan ringan**: "Aplikasi ini tetap update otomatis tanpa harus download ulang."

### PWA setup (manifest-only, sesuai aturan)
- Tambah `public/manifest.webmanifest` dengan: `name`, `short_name`, `theme_color`, `background_color`, `display: standalone`, `start_url: "/"`, `icons` (192 & 512 dari logo Teras Dakwah).
- Tambah ikon `public/icon-192.png` & `public/icon-512.png` (pakai logo TD yang ada di Cloudinary).
- Tambah ke `index.html` head:
  - `<link rel="manifest" href="/manifest.webmanifest">`
  - `<meta name="theme-color" content="#...">`
  - `<link rel="apple-touch-icon" href="/icon-192.png">`
- **Tidak menambahkan service worker / vite-plugin-pwa** (user tidak minta offline; sesuai aturan PWA default).

### File yang diubah / dibuat
- **Baru**: `src/pages/DownloadApp.tsx`, `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`.
- **Diubah**: `src/App.tsx` (route baru), `src/pages/Profil.tsx` (menu baru), `index.html` (manifest + theme tag).

---

## Rangkuman

| Bagian | Hasil |
|---|---|
| Scan QR white screen | Hilang — flow di-guard, error ditampilkan, ada tombol retry |
| Force close | Berkurang — semua throw ditangani, tidak ada unhandled rejection |
| Halaman Download App | Ada di Profil, ramah orang awam, tombol install PWA + panduan Android/iOS/Windows |
| Installable di HP | Ya, lewat manifest (tanpa offline / service worker) |
