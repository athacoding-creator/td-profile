# Architecture rules

- Home banners reuse `hero_slides` and the `hero` storage bucket; keep display and management in dedicated modules so event data and settings remain independent.
- A banner CTA is enabled only when both its label and safe HTTP(S) URL are present; disabling it clears both fields to avoid stale links.
- Curriculum class listings use episode-program membership, independently from event type, so listing fixes do not alter paid-class behavior.
- Attendance Excel exports support either one selected event or one selected program. Event exports include only matching event_id rows; program exports include attendance from every event whose program_id matches the selected program.
- `event_types.value` adalah kode stabil yang dipakai oleh `events.event_type`; kode tidak boleh diubah setelah dipakai. Label, urutan, status aktif, dan `default_registration_type` (`free`, `infaq`, atau `paid`) dikelola admin.
- Form Buat/Edit Event membaca tipe aktif dari `public.event_types`. Default pembayaran hanya mengisi nilai awal; `events.registration_type` tetap disimpan per event dan boleh berbeda dari default tipe. Jangan mengubah event lama saat default tipe diperbarui.
- Tipe yang sudah direferensikan oleh `events.event_type` tidak boleh dihapus permanen; nonaktifkan tipe tersebut agar tidak muncul untuk event baru. Tipe legacy tetap dipertahankan dan dikelola melalui katalog.
