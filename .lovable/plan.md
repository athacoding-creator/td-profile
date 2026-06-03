# Rencana Perbaikan Pembayaran — Auto-Fix Tanpa Error

Setelah saya teliti, ada **3 bug akar** yang membuat fitur kemarin terasa "tidak berfungsi". Semuanya akan diperbaiki sekaligus.

---

## Bug 1 — Tombol Setujui / Tolak di Admin tidak berefek
**Akar masalah:** Tabel `registrations` **tidak punya policy UPDATE** sama sekali (cek RLS: hanya ada SELECT/INSERT/DELETE). Jadi saat admin klik Setujui, Supabase diam-diam mengembalikan `0 rows updated` — toast "berhasil" muncul tapi data tidak berubah.

**Fix:** Tambah RLS policy via migration:
```sql
CREATE POLICY reg_update_admin ON public.registrations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
```

## Bug 2 — Update error karena kolom `updated_at` tidak ada
**Akar masalah:** Di `Donations.tsx`, fungsi `update()` mengirim `updated_at: new Date().toISOString()`. Tapi skema `registrations` **tidak punya kolom `updated_at`** → PostgREST menolak dengan error 400.

**Fix:** Hapus field `updated_at` dari kedua `update()` (DonationTableRow & DonationMobileCard). Tidak perlu menambah kolom karena tidak dipakai di mana-mana.

## Bug 3 — QRIS user tidak muncul ("Metode pembayaran belum dikonfigurasi")
**Akar masalah:** Di `Payment.tsx` load QRIS pakai `.maybeSingle()`. Jika admin punya **lebih dari 1 QRIS aktif** untuk kategori yang sama (misalnya 2 QRIS "paid"), `.maybeSingle()` akan **throw error** "more than one row returned" → user lihat pesan error tanpa QRIS.

**Fix:** Ganti ke `.limit(1).maybeSingle()` dengan ordering yang sudah ada, supaya pasti ambil 1 baris meskipun banyak QRIS aktif:
```ts
.select("*")
.eq("category", category)
.eq("is_active", true)
.order("order_index", { ascending: true })
.limit(1)
.maybeSingle();
```

---

## File yang berubah
1. **Migration baru** — tambah policy UPDATE untuk admin di `registrations`.
2. **`src/pages/admin/Donations.tsx`** — hapus `updated_at` dari 2 fungsi `update()`.
3. **`src/pages/Payment.tsx`** — tambah `.limit(1)` sebelum `.maybeSingle()` di query `qris_methods`.

## Tidak diubah
- Struktur tabel (tidak ada perubahan skema kolom).
- `QrisManager.tsx` (tidak ada bug riil di sana — semua CRUD QRIS sudah jalan; gejala "error" sebenarnya muncul di sisi user karena Bug 3).
- Alur infaq via WA (sudah benar).

Setelah 3 perbaikan ini, alur lengkap akan jalan: admin klik Setujui → status berubah → user yang sudah approved skip halaman bayar → user lain selalu lihat QRIS aktif tanpa error.

Setujui rencana ini? Setelah disetujui, saya implementasi sekaligus.