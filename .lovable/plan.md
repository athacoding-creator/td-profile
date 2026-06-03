## Tujuan

Tambah fitur **Event Online** dengan embed video YouTube. Flow berbeda untuk online vs offline:

- **Offline** → daftar → Scan QR di lokasi → dapat poin (alur lama, tidak berubah)
- **Online** → daftar → wajib infaq dulu (pakai flow infaq yang sudah ada, walaupun event aslinya free) → setelah kirim WA, halaman event menampilkan embed YouTube → tanpa poin
- Kalau user buka ulang halaman event online setelah konfirmasi infaq → video langsung tampil (tidak perlu bayar lagi)

## Perubahan Database (minimal, hemat)

Tambah **2 kolom saja** di tabel `events` (tidak bikin tabel baru — hemat database):

| Kolom | Tipe | Kegunaan |
|---|---|---|
| `is_online` | boolean default false | Penanda event online |
| `youtube_url` | text nullable | Link YouTube (full URL atau ID, parser di frontend) |

**Tidak perlu** tabel baru karena 1 event = 1 link YouTube. Status "sudah daftar online" sudah tercatat di `registrations` (pakai `payment_status` yang sudah ada).

## Perubahan Admin (`src/pages/admin/Events.tsx`)

Di form Create & Edit event, tambah:
- Toggle **"Event Online (YouTube)"**
- Kalau aktif → muncul input **"Link YouTube"** (placeholder: `https://youtube.com/watch?v=...` atau ID)
- Kalau aktif → otomatis perlakukan event seperti **infaq** untuk pendaftaran (frontend logic), walaupun `registration_type` aslinya free
- Validasi: kalau is_online = true, youtube_url wajib diisi

## Perubahan User Flow

### `src/pages/EventDetail.tsx`
- Kalau `event.is_online`:
  - Tombol "Daftar" → arahkan ke halaman Payment dengan mode **infaq paksa** (lewat query param `?mode=infaq` atau cek `is_online` di Payment)
  - Cek `registration` user: kalau sudah ada record (status apapun selain rejected) → tampilkan **embed YouTube** (komponen `<YoutubeEmbed url={event.youtube_url} />`)
  - Kalau belum daftar → sembunyikan video, tampilkan CTA daftar
- Kalau offline → alur lama (Scan QR + poin)

### `src/pages/Payment.tsx`
- Kalau `event.is_online === true` → pakai cabang infaq (yang sudah ada — tidak perlu upload bukti, langsung WA admin), abaikan `registration_type` event
- Setelah klik WA admin, **insert registration** dengan `payment_status='pending'` dan `amount_paid` sesuai input → supaya halaman EventDetail bisa deteksi "sudah daftar" dan tampilkan video

### Komponen baru: `src/components/YoutubeEmbed.tsx`
- Parser sederhana: terima URL/ID YouTube → render `<iframe>` responsive 16:9
- Pakai lazy loading

## Yang TIDAK berubah

- Event offline: alur Scan QR + poin tetap sama
- Sistem poin: event online tidak kasih poin (cukup skip insert ke `attendance`)
- QRIS Manager & Donations admin: tetap pakai infrastruktur yang ada

## Saran Tambahan (opsional, untuk dipertimbangkan)

1. **Validasi link YouTube** di admin — regex sederhana untuk youtube.com/youtu.be agar tidak salah paste.
2. **Tombol "Buka di YouTube"** di bawah embed sebagai fallback kalau iframe diblokir.
3. **Indikator visual** di card event list: badge "🔴 ONLINE" supaya user langsung tahu sebelum klik.
4. **Privacy mode**: pakai `youtube-nocookie.com/embed/...` supaya lebih ringan dan tidak tracking.
5. **Kalau infaq online ditolak admin** → record tetap ada, tapi video disembunyikan lagi (cek `payment_status !== 'rejected'`). Atau alternatif: untuk event online infaq bebas (sukarela seperti infaq biasa), tidak perlu konfirmasi admin sama sekali → video langsung muncul begitu user klik "Saya sudah infaq". **Saya rekomendasi opsi kedua** karena konsisten dengan aturan infaq sebelumnya (sukarela, urusan langsung WA admin, tanpa verifikasi).

## File yang Disentuh

- Migration baru: tambah `is_online`, `youtube_url` di `events`
- `src/pages/admin/Events.tsx` — toggle + input link
- `src/pages/EventDetail.tsx` — branching online/offline + render embed
- `src/pages/Payment.tsx` — paksa mode infaq jika `is_online`
- `src/components/YoutubeEmbed.tsx` — komponen baru
- `src/pages/admin/useAdminData.ts` — tambah field di select query
