## Tujuan

1. **Tutup fitur "QR Kehadiran Saya" di halaman Profil** (belum dipakai) — ganti jadi "Masih dalam pengembangan".
2. **Perbaiki QR event/program** agar bisa di-scan pakai kamera HP bawaan / Google Lens — selama ini QR cuma berisi token UUID sehingga external scanner tidak tahu mau ke mana.

Scan QR di tiap event (tombol "Scan QR Absensi" di EventDetail + halaman ScanQR) **tetap berfungsi normal** — tidak diubah alurnya.

---

## Bagian 1 — Tutup menu QR di Profil

File: `src/pages/Profil.tsx`

- Item menu **"QR Kehadiran saya"** tidak lagi membuka view QR. Diganti jadi item dengan badge *"Segera hadir"* dan saat diklik menampilkan toast: *"Fitur QR Kehadiran masih dalam pengembangan."*
- View internal `"qr"` + generator `QRCode.toDataURL(user.id, …)` dihapus (bersih, tidak meninggalkan dead code). Import `qrcode` dihapus dari file ini.
- Tidak ada perubahan DB.

---

## Bagian 2 — Perbaikan QR Event agar terbaca Google Lens / kamera HP

Akar masalah: di `src/pages/admin/Events.tsx` token mentah (`evToken`/`progToken`) langsung di-encode jadi QR. Kamera HP yang scan cuma melihat teks UUID, tidak otomatis membuka aplikasi.

Solusi: QR berisi URL lengkap ke website.

```
QR Event   → https://<domain>/scan?e=<eventId>&t=<token>
QR Program → https://<domain>/scan?p=<programId>&t=<token>
```

### Perubahan

**Baru — `src/lib/qrUrl.ts`**
- `buildEventQrUrl(eventId, token)` → `${window.location.origin}/scan?e=...&t=...`
- `buildProgramQrUrl(programId, token)` → `${origin}/scan?p=...&t=...`

**Baru — `src/pages/ScanLanding.tsx` di route `/scan`**

Halaman ringkas yang menangani hasil scan dari kamera eksternal:

1. Baca `e`/`p` + `t` dari query.
2. Jika user **belum login** → simpan URL lengkap ke `sessionStorage["postLoginRedirect"]`, lalu `navigate("/auth")`. Setelah login, hook auth membaca key ini dan membawa user kembali ke `/scan?...` — proses dilanjut otomatis.
3. Jika user **belum lengkap profil** → toast + arahkan ke `/profil` (URL `/scan?...` tetap disimpan untuk lanjut setelah profil lengkap).
4. Jika sudah login & profil lengkap:
   - Resolve `event_id` dari token (lihat Bagian 3).
   - Panggil `supabase.rpc("record_attendance", { _event_id, _token })`.
   - Sukses → `refreshProfile()` lalu `navigate("/event/:id/sukses")`.
   - Error → tampilkan kartu error ramah ("Acara belum dimulai", "Sudah absen", dst.) + tombol "Lihat detail event".
5. UI: header + spinner "Memproses absensi…" supaya user tahu sedang dikerjakan, bukan stuck.

**Diubah — `src/pages/admin/Events.tsx`**
- `showQR()` membungkus token jadi URL pakai `buildEventQrUrl` / `buildProgramQrUrl` sebelum `QRCode.toDataURL(...)`.
- Tampilan QR & tombol download tetap sama (cuma isi QR-nya yang berubah).

**Diubah — `src/pages/admin/Scan.tsx`** *(jika scanner admin mendekode hasil ke `record_attendance` dengan asumsi token mentah)*
- Jika hasil decode berupa URL ke `/scan?...`, ekstrak `t` dan `e`/`p` dulu sebelum panggil RPC. Kalau bukan URL, perlakukan sebagai token mentah (backward compat untuk QR lama yang sudah tercetak).

**Diubah — `src/pages/ScanQR.tsx`**
- Tambah parsing yang sama (URL → ambil `t`) di fungsi `validate()` supaya scanner in-app juga toleran terhadap QR baru.

**Diubah — `src/hooks/useAuth.tsx` (atau `src/pages/Auth.tsx`)**
- Setelah login sukses: cek `sessionStorage.getItem("postLoginRedirect")`. Kalau ada, `navigate(url, { replace: true })` dan hapus key tersebut. Default tetap ke `/` jika tidak ada.

**Diubah — `src/App.tsx`**
- Tambah route `<Route path="/scan" element={<ScanLanding />} />` (public; auth ditangani di dalam komponen).

---

## Bagian 3 — Database (kecil)

Untuk QR Program, kita butuh cara menemukan event aktif dari token program. Fungsi `find_active_event_by_program_token` sudah ada, tapi tidak dipanggil dari client (security definer + dipakai internal `record_attendance`). 

Solusi paling sederhana **tanpa migration baru**: di `ScanLanding`, kalau URL berisi `e=...` (event langsung), kirim apa adanya ke `record_attendance(_event_id, _token)`. Kalau hanya `p=...` (program), kirim **salah satu event id apa pun milik program tersebut** + token program — `record_attendance` sudah handle: kalau token bukan token event, fungsi akan mencari event aktif lewat `find_active_event_by_program_token` secara internal.

Jadi cukup tambahkan: client query `events.select("id").eq("program_id", p).limit(1)` untuk dapat satu `event_id` rujukan, lalu panggil RPC. **Tidak perlu migration baru.**

---

## File yang dibuat / disentuh

**Baru**
- `src/lib/qrUrl.ts`
- `src/pages/ScanLanding.tsx`

**Disunting**
- `src/App.tsx` (route `/scan`)
- `src/pages/Profil.tsx` (tutup menu QR)
- `src/pages/admin/Events.tsx` (QR berisi URL)
- `src/pages/admin/Scan.tsx` (toleran URL & token mentah)
- `src/pages/ScanQR.tsx` (toleran URL & token mentah)
- `src/hooks/useAuth.tsx` atau `src/pages/Auth.tsx` (postLoginRedirect)

---

## Catatan

- QR lama yang sudah terlanjur tercetak (berisi token mentah) **tetap bisa di-scan dari dalam app** karena parser di `ScanQR.tsx` toleran kedua format. Untuk Google Lens, admin perlu cetak ulang QR — sekali klik di halaman admin Event.
- Tidak ada perubahan logika `record_attendance` atau jam scan; semua sudah benar dari iterasi sebelumnya.