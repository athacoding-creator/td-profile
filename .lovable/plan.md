## Tujuan

Setiap event dengan mode **Daftar Online** atau **paid/infaq** akan menampilkan section **Doa Terbaik** di halaman Detail Event. Doa diambil otomatis dari library global. Tampil 1 doa dulu, ada tombol **Load More** (+3 per klik) supaya tidak ngelag. Section muncul dengan animasi slide-down saat user sudah daftar/infaq. Pilihan nominal infaq juga akan diurutkan dari paling besar ke paling kecil.

## Yang akan dibuat / diubah

### 1. Tabel `prayers` (library doa global)
- Kolom: `title`, `arabic`, `latin`, `translation`, `category` (opsional, default "umum"), `order_index`, `is_active`.
- Akses: semua user (termasuk anon) bisa **baca**; hanya admin yang bisa kelola.
- Seed awal: 8–10 doa populer (Doa sebelum belajar, Doa pembuka majelis, Doa penutup majelis/kafaratul majlis, Doa minta ilmu bermanfaat, Doa istiqomah, Doa untuk orang tua, Sayyidul istighfar, Doa minta husnul khotimah, dll.).

### 2. Komponen baru `PrayerList`
- Props: tidak perlu event-specific (library global).
- Fetch sekali, cache di-state.
- Tampil 1 doa pertama. Tombol **"Tampilkan doa lainnya"** menambah 3 doa per klik. Tombol hilang saat semua doa sudah tampil.
- Setiap doa pakai animasi slide-down (Tailwind `animate-in slide-in-from-top-2 fade-in` atau equivalent).
- Card doa berisi: judul, teks Arab (rtl, font besar), latin (italic), arti.

### 3. Update `src/pages/EventDetail.tsx`
- Munculkan `<PrayerList />` di dalam blok `{registration && (...)}` (sudah ada), hanya jika:
  - `event.is_online && registration.attendance_mode === "online"`, **atau**
  - `event.registration_type === "paid"`, **atau**
  - `event.registration_type === "infaq"`.
- Letak: setelah info status pendaftaran, sebelum tombol pembayaran/aksi lain — sehingga begitu user selesai klik daftar/infaq, doa langsung muncul slide down di halaman detail.
- Section punya heading "🤲 Doa Terbaik untuk Sesi Ini" + subteks kecil.

### 4. Urutkan nominal infaq dari besar → kecil
- Di **`src/pages/Payment.tsx`** (form infaq dan form paid-nominal): ubah array `[5000, 10000, 20000, 50000]` → `[50000, 20000, 10000, 5000]`.
- Di **`src/pages/EventDetail.tsx`** form infaq inline (sekitar line 402): sama, ubah ke urutan desc.
- Default `paymentForm.amount` tetap nominal terkecil (5000) supaya user sadar memilih, atau tetap mengikuti `min_infaq`. (Tidak diubah perilakunya, hanya urutan tombol.)

## Detail teknis (untuk developer)

```sql
CREATE TABLE public.prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  arabic text NOT NULL,
  latin text,
  translation text NOT NULL,
  category text DEFAULT 'umum',
  order_index int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.prayers TO anon, authenticated;
GRANT ALL ON public.prayers TO service_role;
ALTER TABLE public.prayers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active prayers" ON public.prayers
  FOR SELECT USING (is_active = true);
CREATE POLICY "admin manages prayers" ON public.prayers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
```

Plus seed `INSERT` 8–10 doa.

Komponen `PrayerList` pakai `useState<number>(visibleCount)` mulai dari 1, increment +3. Animasi: `key={prayer.id}` + class `animate-in slide-in-from-top-4 fade-in duration-500`.

## Yang TIDAK diubah
- Halaman Payment tidak menampilkan doa (sesuai jawaban: doa hanya di Detail Event).
- Tidak ada admin UI untuk kelola doa di iterasi ini (library dari seed; bisa ditambah nanti via Settings admin kalau diminta).
- Logika gating video YouTube, pembayaran, QR scan tidak disentuh.
