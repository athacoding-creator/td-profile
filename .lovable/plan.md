# Rencana Perbaikan Alur Pembayaran (User & Admin)

## Masalah saat ini
1. Di admin **Daftar Pembayaran** (Donations), tombol Setujui/Tolak terasa "tidak berfungsi" karena daftar tidak ter-refresh setelah update — status di layar tetap "Pending".
2. Bukti pembayaran dibuka inline di bawah baris/kartu → tampilan jadi penuh & sesak.
3. Bukti pembayaran tidak pernah terhapus dari storage walaupun sudah dikonfirmasi/ditolak.
4. User yang sudah dikonfirmasi pembayarannya tetap diminta bayar ulang ketika membuka event.
5. Event **Infaq** ikut alur upload bukti + verifikasi admin, padahal sifatnya sukarela & langsung diurus via WA.

---

## Bagian 1 — Sisi Admin (`src/pages/admin/Donations.tsx`)

### A. Tombol Setujui / Tolak berfungsi & auto-refresh
- Ambil `refresh` (atau setara) dari `useAdmin()`; jika belum ada, tambahkan helper refresh registrations di `useAdminData.ts`.
- Setelah `update()` sukses → panggil refresh agar baris berpindah status / hilang dari filter "pending".

### B. Bukti pembayaran dibuka di tab baru (bukan inline)
- Hapus state `showProof` + blok `<tr>` / `<div>` preview gambar di `DonationTableRow` dan `DonationMobileCard`.
- Ganti tombol "Lihat Bukti" menjadi link `<a href={payment_proof_url} target="_blank" rel="noopener noreferrer">` dengan ikon `Eye` — buka langsung di tab baru.
- Tombol Download tetap, tapi pindah jadi link kecil di samping (opsional) — tidak lagi muncul setelah expand.

### C. Auto-hapus bukti setelah dikonfirmasi / ditolak
- Pada fungsi `update(status)` di kedua komponen:
  1. Hapus file di Supabase Storage bucket `payment_proofs` berdasarkan path yang diekstrak dari `payment_proof_url`.
  2. Update row: `payment_status = status`, `payment_proof_url = null`.
  3. Refresh data.
- Helper kecil: `extractStoragePath(publicUrl)` → ambil bagian setelah `/payment_proofs/`.

### D. (Opsional) Sembunyikan registrasi infaq dari daftar verifikasi
- Karena infaq tidak butuh verifikasi (lihat Bagian 2), filter `donationRegistrations` hanya menampilkan `event.registration_type === "paid"`.
- Tambahkan ringkasan terpisah "Infaq masuk via WA" sebagai catatan kecil (tanpa tabel), atau biarkan stats total tetap menghitung infaq tapi tabel hanya menampilkan `paid`.

---

## Bagian 2 — Sisi User (`src/pages/Payment.tsx` & `src/pages/EventDetail.tsx`)

### A. Paid event — skip jika sudah dikonfirmasi
- Saat load di `Payment.tsx`, jika `event.registration_type === "paid"` dan `registration?.payment_status === "approved"`:
  - Tampilkan kartu "✅ Pembayaran sudah dikonfirmasi" + tombol kembali ke detail event.
  - Selama event masih aktif (status `active` / belum lewat), user tidak perlu bayar ulang.
- Tambahkan logika sama di `EventDetail.tsx`: tombol CTA berubah dari "Bayar Sekarang" → "Sudah Terbayar" (disabled) jika `approved`.

### B. Infaq event — alur baru: langsung ke WA tanpa upload bukti
- Di `Payment.tsx`, deteksi `event.registration_type === "infaq"`:
  - Tampilkan QRIS Infaq + nominal anjuran (min/max sebagai info).
  - **Hilangkan**: input upload bukti, tombol "Konfirmasi & Chat Admin" yang submit ke storage.
  - **Ganti**: satu tombol "💬 Hubungi Admin via WhatsApp" yang langsung membuka `wa.me/<admin>?text=…` dengan template: "Saya sudah berinfaq sebesar Rp ... untuk {{event_title}}. Terima kasih."
  - Tidak ada row registrations dibuat dari sini (infaq sukarela, tidak diverifikasi sistem).
- `EventDetail.tsx`: CTA infaq berbunyi "Berinfaq via WA".

### C. Tetap untuk Paid
- Alur upload bukti + chat admin **hanya berlaku untuk `paid`**.
- Setelah upload, status `pending` → user diarahkan ke WA seperti sekarang.

---

## File yang berubah
- `src/pages/admin/Donations.tsx` — refresh, hapus inline preview, buka tab baru, auto-delete bukti, filter paid-only.
- `src/pages/admin/useAdminData.ts` — pastikan ada cara refresh registrations.
- `src/pages/Payment.tsx` — cabang `paid` (skip jika approved) vs `infaq` (tanpa upload, langsung WA).
- `src/pages/EventDetail.tsx` — label CTA sesuai status.

## Tidak diubah
- Skema database (struktur tabel `registrations`, `payment_proofs` bucket tetap).
- `QrisManager.tsx` (admin QRIS) tetap, hanya jadi sumber gambar QRIS.

Setujui rencana ini? Setelah disetujui, saya implementasi sekaligus.