# Implementasi Fitur Pendaftaran Event Futsal & Mini Soccer

**Platform:** TD-Profile (Teras Dakwah Profile)
**Versi Dokumen:** 1.0
**Tanggal:** 30 Juli 2026

---

## Daftar Isi

1. [Ringkasan Fitur](#ringkasan-fitur)
2. [Arsitektur dan Desain Database](#arsitektur-dan-desain-database)
3. [Alur Pengguna (User Flow)](#alur-pengguna-user-flow)
4. [Implementasi Migrasi Database](#implementasi-migrasi-database)
5. [Update Tipe TypeScript](#update-tipe-typescript)
6. [Implementasi Halaman Admin: Pembuatan Event](#implementasi-halaman-admin-pembuatan-event)
7. [Implementasi Halaman Detail Event: Pilihan Posisi](#implementasi-halaman-detail-event-pilihan-posisi)
8. [Implementasi Halaman Pembayaran](#implementasi-halaman-pembayaran)
9. [Implementasi Halaman Admin: Verifikasi Pembayaran](#implementasi-halaman-admin-verifikasi-pembayaran)
10. [Konfigurasi Routing](#konfigurasi-routing)
11. [Ringkasan File yang Dimodifikasi](#ringkasan-file-yang-dimodifikasi)
12. [Skalabilitas dan Pengembangan Lanjutan](#skalabilitas-dan-pengembangan-lanjutan)

---

## Ringkasan Fitur

Fitur ini memungkinkan admin TD-Profile untuk membuat event olahraga (futsal dan mini soccer) dengan sistem pendaftaran berbayar (paid), di mana biaya pendaftaran dapat berbeda berdasarkan posisi pemain. Peserta yang mendaftar akan melihat harga otomatis sesuai posisi yang dipilih, melakukan pembayaran, dan mengkonfirmasi melalui WhatsApp.

**Ketentuan Utama:**

| Aspek | Keterangan |
| :--- | :--- |
| **Tipe Event** | `futsal` dan `mini-soccer` (via kolom `event_type`) |
| **Tipe Pendaftaran** | `paid` (wajib bayar) |
| **Posisi** | Pemain Lapangan, Kiper (extensible ke posisi lain) |
| **Harga** | Ditentukan per event, berbeda per posisi |
| **Konfirmasi** | Via WhatsApp ke nomor 0851-1151-4040 |
| **Pesan WA** | Berisi nama peserta, nama event, posisi, dan nominal |

---

## Arsitektur dan Desain Database

Arsitektur database dirancang dengan prinsip **pemisahan tanggung jawab**: tabel `events` menyimpan data event secara umum, tabel `event_position_pricing` menyimpan konfigurasi harga per posisi, dan tabel `registrations` mencatat posisi yang dipilih peserta.

### 3.1. Tabel `events` (Tidak Dimodifikasi)

Tabel `events` yang sudah ada cukup menggunakan kolom `event_type` dan `registration_type` tanpa perubahan struktur. Admin akan mengisi `event_type = 'futsal'` atau `'mini-soccer'` dan `registration_type = 'paid'` saat membuat event.

### 3.2. Tabel Baru: `event_position_pricing`

Tabel ini menyimpan konfigurasi harga untuk setiap posisi pada event tertentu. Setiap event futsal/mini-soccer akan memiliki minimal dua baris data: satu untuk Pemain Lapangan dan satu untuk Kiper.

| Kolom | Tipe Data | Constraints | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | ID unik baris harga |
| `event_id` | `uuid` | NOT NULL, FK → `events(id)` ON DELETE CASCADE | Referensi ke event |
| `position` | `text` | NOT NULL | Nama posisi (misal: `'Pemain Lapangan'`, `'Kiper'`) |
| `price` | `numeric` | NOT NULL, DEFAULT 0 | Harga pendaftaran (dalam Rupiah) |
| `is_active` | `boolean` | DEFAULT `true` | Status aktif/tidak |
| `created_at` | `timestamptz` | DEFAULT `now()` | Waktu pembuatan |

### 3.3. Kolom Baru pada `registrations`

| Kolom | Tipe Data | Constraints | Keterangan |
| :--- | :--- | :--- | :--- |
| `position` | `text` | NULLABLE | Posisi pemain yang dipilih saat mendaftar |

---

## Alur Pengguna (User Flow)

### Alur Admin: Membuat Event Futsal/Mini Soccer

```
Admin → Halaman Admin Event → Klik "Buat Event"
  → Isi Judul, Venue, Tanggal, dll.
  → Tipe Pendaftaran: "Wajib Bayar"
  → Tipe Event: "Futsal" atau "Mini Soccer"
  → Tambahkan posisi dan harga:
      - Pemain Lapangan: Rp 10.000
      - Kiper: Rp 15.000
  → Klik "Buat Event"
```

### Alur Peserta: Mendaftar dan Membayar

```
Peserta → Halaman Event → Lihat Detail Event
  → Klik "Daftar Event"
  → Pilih Posisi (Pemain Lapangan / Kiper)
  → Sistem tampilkan harga sesuai posisi
  → Klik "Lanjut ke Pembayaran"
  → Halaman Pembayaran:
      - Upload bukti pembayaran
      - (Opsional) Tulis pesan/doa
      - Klik "Konfirmasi Pembayaran"
  → Tombol "Konfirmasi via WhatsApp" muncul
  → Klik → Buka WhatsApp dengan pesan otomatis
```

---

## Implementasi Migrasi Database

Buat file migrasi baru di `supabase/migrations/20260730000000_add_futsal_pricing.sql`:

```sql
-- ============================================================
-- Migrasi: Fitur Pendaftaran Event Futsal & Mini Soccer
-- Tanggal: 2026-07-30
-- Deskripsi:
--   - Tambah kolom 'position' pada tabel registrations
--   - Buat tabel baru 'event_position_pricing' untuk harga per posisi
--   - Atur RLS policies
-- ============================================================

-- 1. Tambahkan kolom 'position' pada tabel registrations
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS position text;

-- 2. Buat tabel 'event_position_pricing'
CREATE TABLE IF NOT EXISTS public.event_position_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  position text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, position)
);

-- 3. Validasi: harga harus positif
ALTER TABLE public.event_position_pricing
  ADD CONSTRAINT event_position_pricing_price_positive
  CHECK (price >= 0);

-- 4. Validasi: posisi tidak boleh kosong
ALTER TABLE public.event_position_pricing
  ADD CONSTRAINT event_position_pricing_position_not_empty
  CHECK (position IS NOT NULL AND length(trim(position)) > 0);

-- 5. Enable RLS
ALTER TABLE public.event_position_pricing ENABLE ROW LEVEL SECURITY;

-- 6. Policy: Semua orang bisa melihat konfigurasi harga
CREATE POLICY "event_position_pricing_select_all"
  ON public.event_position_pricing
  FOR SELECT
  USING (true);

-- 7. Policy: Hanya admin yang bisa membuat/mengubah/menghapus
CREATE POLICY "event_position_pricing_insert_admin"
  ON public.event_position_pricing
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "event_position_pricing_update_admin"
  ON public.event_position_pricing
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "event_position_pricing_delete_admin"
  ON public.event_position_pricing
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

---

## Update Tipe TypeScript

### File: `src/integrations/supabase/types.ts`

Tambahkan definisi tabel baru `event_position_pricing` di dalam `Tables`:

```typescript
event_position_pricing: {
  Row: {
    created_at: string
    event_id: string
    id: string
    is_active: boolean | null
    position: string
    price: number
  }
  Insert: {
    created_at?: string
    event_id: string
    id?: string
    is_active?: boolean | null
    position: string
    price?: number
  }
  Update: {
    created_at?: string
    event_id?: string
    id?: string
    is_active?: boolean | null
    position?: string
    price?: number
  }
  Relationships: [
    {
      foreignKeyName: "event_position_pricing_event_id_fkey"
      columns: ["event_id"]
      isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },
  ]
}
```

Tambahkan kolom `position` pada tabel `registrations` (Row, Insert, Update):

```typescript
// Di dalam registrations.Row, Insert, Update — tambahkan:
position: string | null
```

---

## Implementasi Halaman Admin: Pembuatan Event

### File: `src/pages/admin/Events.tsx`

Bagian ini menjelaskan modifikasi pada form **CreateEvent** agar admin dapat menambahkan konfigurasi harga per posisi saat membuat event futsal/mini soccer.

```tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

// ============================================================
// KONSTANTA: Daftar posisi default untuk event futsal/mini soccer
// ============================================================
const DEFAULT_POSITIONS = [
  { position: "Pemain Lapangan", price: 10000 },
  { position: "Kiper", price: 15000 },
];

// ============================================================
// TIPE DATA
// ============================================================
interface PositionEntry {
  id: string;
  position: string;
  price: string;
}

// ============================================================
// KOMPONEN: Form Pembuatan Event (Extended)
// ============================================================
function CreateEvent({
  programs,
  defaultPoints,
  onCreated,
}: {
  programs: any[];
  defaultPoints: number;
  onCreated: () => void;
}) {
  // State form utama
  const [form, setForm] = useState<any>({
    gender: "ALL",
    points_reward: defaultPoints,
    program_id: "",
    is_pinned: false,
    is_recurring: false,
    recurring_days: [],
    registration_type: "free",
    price: 0,
    min_infaq: 0,
    max_infaq: 50000,
    max_participants: "",
    is_online: false,
    youtube_url: "",
    episode_count: 0,
    episode_youtube_urls: [],
    event_type: "",
  });

  // State untuk konfigurasi harga posisi (hanya untuk futsal/mini soccer)
  const [positions, setPositions] = useState<PositionEntry[]>(
    DEFAULT_POSITIONS.map((p) => ({
      id: crypto.randomUUID(),
      position: p.position,
      price: String(p.price),
    }))
  );

  // Reset posisi saat event_type berubah
  useEffect(() => {
    if (form.event_type === "futsal" || form.event_type === "mini-soccer") {
      if (positions.length === 0) {
        setPositions(
          DEFAULT_POSITIONS.map((p) => ({
            id: crypto.randomUUID(),
            position: p.position,
            price: String(p.price),
          }))
        );
      }
    }
  }, [form.event_type]);

  // Konstanta untuk mengecek apakah event adalah olahraga
  const isSportEvent =
    form.event_type === "futsal" || form.event_type === "mini-soccer";

  // ============================================================
  // FUNGSI: Tambah/hapus posisi
  // ============================================================
  const addPosition = () => {
    setPositions([
      ...positions,
      { id: crypto.randomUUID(), position: "", price: "0" },
    ]);
  };

  const removePosition = (id: string) => {
    setPositions(positions.filter((p) => p.id !== id));
  };

  const updatePosition = (id: string, field: "position" | "price", value: string) => {
    setPositions(
      positions.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // ============================================================
  // FUNGSI: Validasi dan Submit
  // ============================================================
  const create = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi posisi untuk event olahraga
    if (isSportEvent) {
      const validPositions = positions.filter((p) => p.position.trim() && Number(p.price) > 0);
      if (validPositions.length === 0) {
        return toast.error("Tambahkan minimal satu posisi dengan harga.");
      }
    }

    // Validasi form biasa
    if (!form.title?.trim()) return toast.error("Judul event wajib diisi.");
    if (!form.venue?.trim()) return toast.error("Venue wajib diisi.");
    if (!form.starts_at) return toast.error("Tanggal mulai wajib diisi.");

    // 1. Insert ke tabel events
    const eventData = {
      title: form.title,
      description: form.description,
      venue: form.venue,
      city: form.city,
      poster_url: form.poster_url,
      event_type: form.event_type || null,
      gender: form.gender,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      group_link: form.group_link || null,
      points_reward: Number(form.points_reward ?? defaultPoints),
      program_id: form.program_id || null,
      status: "active",
      success_message: form.success_message || null,
      speaker: form.speaker || null,
      is_pinned: !!form.is_pinned,
      is_recurring: !!form.is_recurring,
      recurring_days: form.is_recurring ? (form.recurring_days ?? []) : [],
      recurring_start_time: form.is_recurring ? form.recurring_start_time : null,
      recurring_end_time: form.is_recurring ? form.recurring_end_time : null,
      recurring_until: form.is_recurring ? (form.recurring_until || null) : null,
      registration_type: "paid",
      price: 0, // Harga disimpan di tabel event_position_pricing
      min_infaq: 0,
      max_infaq: 0,
      max_participants: form.max_participants === "" ? null : Number(form.max_participants),
      is_online: !!form.is_online,
      youtube_url: form.is_online ? (form.youtube_url || null) : null,
      episode_count: 0,
      episode_youtube_urls: [],
    };

    const { data: createdEvent, error: eventError } = await supabase
      .from("events")
      .insert(eventData)
      .select("id")
      .single();

    if (eventError) {
      console.error("Create event error:", eventError);
      return toast.error(`Gagal membuat event: ${eventError.message}`);
    }

    // 2. Insert harga posisi ke tabel event_position_pricing (jika sport event)
    if (isSportEvent) {
      const pricingData = positions
        .filter((p) => p.position.trim() && Number(p.price) > 0)
        .map((p) => ({
          event_id: createdEvent.id,
          position: p.position.trim(),
          price: Number(p.price),
        }));

      if (pricingData.length > 0) {
        const { error: pricingError } = await supabase
          .from("event_position_pricing")
          .insert(pricingData);

        if (pricingError) {
          console.error("Create pricing error:", pricingError);
          toast.error("Event dibuat, namun gagal menyimpan harga posisi.");
          // Tidak rollback event agar admin bisa memperbaiki pricing nanti
        }
      }
    }

    toast.success("Event berhasil dibuat!");
    setForm({
      gender: "ALL",
      points_reward: defaultPoints,
      program_id: "",
      is_pinned: false,
      is_recurring: false,
      recurring_days: [],
      registration_type: "free",
      price: 0,
      min_infaq: 0,
      max_infaq: 50000,
      max_participants: "",
      is_online: false,
      youtube_url: "",
      episode_count: 0,
      episode_youtube_urls: [],
      event_type: "",
    });
    setPositions(
      DEFAULT_POSITIONS.map((p) => ({
        id: crypto.randomUUID(),
        position: p.position,
        price: String(p.price),
      }))
    );
    onCreated();
  };

  // ============================================================
  // RENDER: Form UI
  // ============================================================
  return (
    <form onSubmit={create} className="grid gap-3 md:gap-4 md:grid-cols-2">
      {/* Field-field standar (sama seperti sebelumnya) */}
      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Judul</Label>
        <Input
          required
          value={form.title ?? ""}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="text-sm h-9 sm:h-10"
          placeholder="Contoh: Futsal Cup Ramadhan 2026"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Pengisi Acara (Speaker/Coach)</Label>
        <Input
          value={form.speaker ?? ""}
          onChange={(e) => setForm({ ...form, speaker: e.target.value })}
          placeholder="Contoh: Coach Ahmad"
          className="text-sm h-9 sm:h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Tipe Event</Label>
        <select
          className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm"
          value={form.event_type ?? ""}
          onChange={(e) => setForm({ ...form, event_type: e.target.value })}
        >
          <option value="">— Umum (Kajian/Talkshow) —</option>
          <option value="futsal">Futsal</option>
          <option value="mini-soccer">Mini Soccer</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Program</Label>
        <select
          className="h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm"
          value={form.program_id}
          onChange={(e) => setForm({ ...form, program_id: e.target.value })}
        >
          <option value="">— tanpa program —</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Venue</Label>
        <Input
          required
          value={form.venue ?? ""}
          onChange={(e) => setForm({ ...form, venue: e.target.value })}
          className="text-sm h-9 sm:h-10"
          placeholder="Contoh: Lapangan Futsal GOR Serasan"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Kota</Label>
        <Input
          value={form.city ?? ""}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="text-sm h-9 sm:h-10"
        />
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <Label className="text-xs sm:text-sm">Deskripsi</Label>
        <Textarea
          rows={3}
          value={form.description ?? ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Mulai</Label>
        <Input
          type="datetime-local"
          required
          value={form.starts_at ?? ""}
          onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
          className="text-sm h-9 sm:h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Selesai</Label>
        <Input
          type="datetime-local"
          value={form.ends_at ?? ""}
          onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
          className="text-sm h-9 sm:h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Max Peserta</Label>
        <Input
          type="number"
          min="1"
          value={form.max_participants}
          onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
          placeholder="Tanpa batas"
          className="text-sm h-9 sm:h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Poin Reward</Label>
        <Input
          type="number"
          value={form.points_reward ?? defaultPoints}
          onChange={(e) =>
            setForm({ ...form, points_reward: e.target.value })
          }
          className="text-sm h-9 sm:h-10"
        />
      </div>

      {/* ============================================================
          SECTION: Konfigurasi Harga Posisi (hanya muncul jika sport event)
      ============================================================ */}
      {isSportEvent && (
        <div className="md:col-span-2 space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-bold">
                Konfigurasi Harga per Posisi
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tentukan harga pendaftaran untuk setiap posisi pemain
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPosition}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> Tambah Posisi
            </Button>
          </div>

          <div className="space-y-2">
            {positions.map((pos, index) => (
              <div
                key={pos.id}
                className="flex items-center gap-2 rounded-lg border bg-background p-2"
              >
                <span className="text-xs text-muted-foreground w-5">
                  {index + 1}.
                </span>
                <Input
                  placeholder="Nama Posisi"
                  value={pos.position}
                  onChange={(e) =>
                    updatePosition(pos.id, "position", e.target.value)
                  }
                  className="text-sm h-9 flex-1"
                />
                <span className="text-xs text-muted-foreground">Rp</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={pos.price}
                  onChange={(e) =>
                    updatePosition(pos.id, "price", e.target.value)
                  }
                  className="text-sm h-9 w-28"
                />
                {positions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePosition(pos.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Preview total */}
          <div className="flex items-center justify-end gap-2 text-xs">
            <span className="text-muted-foreground">
              Jumlah posisi: {positions.filter((p) => p.position.trim()).length}
            </span>
          </div>
        </div>
      )}

      {/* Pesan Sukses */}
      <div className="space-y-1.5 md:col-span-2">
        <Label className="text-xs sm:text-sm">Pesan Sukses</Label>
        <Textarea
          rows={3}
          placeholder="Selamat, kamu telah berhasil mendaftar!"
          value={form.success_message ?? ""}
          onChange={(e) =>
            setForm({ ...form, success_message: e.target.value })
          }
          className="text-sm"
        />
      </div>

      {/* Tombol Submit */}
      <div className="md:col-span-2">
        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground h-10 text-sm"
        >
          Buat Event
        </Button>
      </div>
    </form>
  );
}
```

---

## Implementasi Halaman Detail Event: Pilihan Posisi

### File: `src/pages/EventDetail.tsx`

Modifikasi halaman detail event untuk menampilkan pilihan posisi saat peserta mendaftar event futsal/mini soccer.

```tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import {
  MapPin, Calendar, Users, Lock, Link2, ChevronLeft, Upload,
  ChevronDown, ChevronUp, Info, MessageCircle, CreditCard,
  Landmark, Wallet, Video, Shield,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { YoutubeEmbed } from "@/components/YoutubeEmbed";
import DonorWall from "@/components/DonorWall";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { computeScanWindow, isRecurring, describeRecurring } from "@/lib/eventSchedule";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ============================================================
// KONSTANTA
// ============================================================
const SPORT_EVENT_TYPES = ["futsal", "mini-soccer"];
const WA_CONFIRMATION_NUMBER = "6285111514040";

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function EventDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // State event
  const [event, setEvent] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // State untuk posisi (sport event)
  const [positionPricing, setPositionPricing] = useState<any[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  // State dialog pendaftaran
  const [registrationChoiceOpen, setRegistrationChoiceOpen] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [guests, setGuests] = useState<any[]>([]);

  // State payment
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    proofFile: null as File | null,
  });
  const [paymentMethod, setPaymentMethod] = useState<any>(null);

  // ============================================================
  // LOAD EVENT & POSITION PRICING
  // ============================================================
  useEffect(() => {
    (async () => {
      // Load event
      const { data: eventData, error } = await supabase
        .from("events")
        .select(
          "id,title,description,venue,city,starts_at,ends_at,status,gender," +
          "event_type,poster_url,group_link,points_reward,program_id," +
          "registration_type,price,min_infaq,max_infaq,max_participants," +
          "speaker,is_online,programs(category,name,code)"
        )
        .eq("id", id)
        .maybeSingle();

      if (error || !eventData) {
        console.error("loadEvent error", error);
        setLoading(false);
        return;
      }
      setEvent(eventData);

      // Load position pricing jika sport event
      const isSportEvent = SPORT_EVENT_TYPES.includes(eventData.event_type);
      if (isSportEvent && eventData.registration_type === "paid") {
        const { data: pricingData } = await supabase
          .from("event_position_pricing")
          .select("*")
          .eq("event_id", eventData.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        setPositionPricing(pricingData || []);
      }

      // Load registration & attendance
      if (user) {
        const { data: r } = await supabase
          .from("registrations")
          .select("*")
          .eq("event_id", eventData.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setRegistration(r || null);

        const { data: a } = await supabase
          .from("attendance")
          .select("*")
          .eq("event_id", eventData.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setAttendance(a || null);
      }

      setLoading(false);
    })();
  }, [id, user]);

  // ============================================================
  // FUNGSI: Klik Daftar
  // ============================================================
  const handleRegisterClick = () => {
    if (!user) return navigate("/auth");
    if (!profile?.is_complete) return navigate("/onboarding");

    setSelectedPosition(null);

    const isSportEvent = SPORT_EVENT_TYPES.includes(event?.event_type);
    if (isSportEvent && event?.registration_type === "paid") {
      // Buka dialog pilihan posisi
      setRegistrationChoiceOpen(true);
    } else {
      // Logika daftar biasa (free/paid tunggal)
      setShowGuestForm(false);
      setRegistrationChoiceOpen(true);
    }
  };

  // ============================================================
  // FUNGSI: Lanjut ke Pembayaran (dengan posisi)
  // ============================================================
  const proceedToPayment = async () => {
    if (!selectedPosition) {
      return toast.error("Silakan pilih posisi terlebih dahulu.");
    }

    // Cek kuota
    const quotaOk = await checkQuota();
    if (!quotaOk) return;

    // Cek gender
    if (event.gender !== "ALL" && profile?.gender !== event.gender) {
      return toast.error(
        `Maaf, event ini khusus untuk ${event.gender === "L" ? "Laki-laki" : "Perempuan"}.`
      );
    }

    // Cek duplikasi pendaftaran
    if (registration) {
      toast.error("Kamu sudah terdaftar di event ini.");
      setRegistrationChoiceOpen(false);
      return;
    }

    setRegistrationChoiceOpen(false);

    // Navigate ke halaman pembayaran dengan state posisi
    navigate(`/event/${event.id}/bayar`, {
      state: {
        selectedPosition,
        positionPrice: positionPricing.find(
          (p) => p.position === selectedPosition
        )?.price ?? 0,
      },
    });
  };

  // ============================================================
  // FUNGSI: Cek Kuota
  // ============================================================
  const checkQuota = async (): Promise<boolean> => {
    if (!event.max_participants) return true;
    const { count, error } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);
    if (error) throw error;
    if ((count ?? 0) + 1 > event.max_participants) {
      toast.error("Maaf, kuota peserta untuk event ini sudah penuh.");
      return false;
    }
    return true;
  };

  // ============================================================
  // RENDER: Loading State
  // ============================================================
  if (loading)
    return (
      <div className="min-h-screen bg-background pb-32">
        <Header />
        <main className="container max-w-3xl py-4 px-3">
          <Skeleton className="mb-4 h-6 w-32 rounded" />
          <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: "3/4" }} />
          <Skeleton className="mt-6 h-8 w-3/4 rounded" />
        </main>
        <BottomNav />
      </div>
    );

  if (!event)
    return (
      <div className="container py-20 text-center">Event tidak ditemukan</div>
    );

  const isSportEvent = SPORT_EVENT_TYPES.includes(event.event_type);
  const isPaid = event.registration_type === "paid";
  const expired = computeScanWindow(event).expired;

  // ============================================================
  // RENDER: Halaman Utama
  // ============================================================
  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="container max-w-3xl py-4 sm:py-8 px-3 sm:px-4">
        {/* Tombol Kembali */}
        <button
          onClick={() => navigate("/")}
          className="mb-4 inline-flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali ke Event
        </button>

        {/* Poster */}
        {event.poster_url && (
          <div className="overflow-hidden rounded-2xl shadow-md">
            <img src={event.poster_url} alt={event.title} className="w-full" />
          </div>
        )}

        {/* Judul */}
        <h1 className="mt-4 sm:mt-6 font-display text-2xl sm:text-3xl font-bold">
          {event.title}
        </h1>
        {event.speaker && (
          <p className="text-accent font-medium mt-1 text-sm sm:text-base">
            {event.speaker}
          </p>
        )}

        {/* Badge Tipe Event */}
        {isSportEvent && (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <Shield className="h-3 w-3" />
              {event.event_type === "futsal" ? "Futsal" : "Mini Soccer"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              Pendaftaran Berbayar
            </span>
          </div>
        )}

        {/* Info Event */}
        <div className="mt-4 space-y-2 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            {new Date(event.starts_at).toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            {event.venue}{event.city ? `, ${event.city}` : ""}
          </div>
          {event.max_participants && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              Max {event.max_participants} peserta
            </div>
          )}
        </div>

        {/* Deskripsi */}
        {event.description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        )}

        {/* ============================================================
            BAGIAN AKSI PENDAFTARAN
        ============================================================ */}
        <div className="mt-6 space-y-3">
          {/* Jika sudah terdaftar */}
          {registration ? (
            <div className="space-y-3">
              {registration.payment_status === "pending" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800">
                    Menunggu verifikasi pembayaran
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Admin akan memverifikasi pembayaran kamu dalam 1x24 jam.
                  </p>
                </div>
              )}
              {registration.payment_status === "approved" && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                  <p className="text-sm font-bold text-green-800">
                    Pendaftaran Disetujui
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Kamu sudah terdaftar di event ini. Sampai jumpa!
                  </p>
                </div>
              )}
              {registration.payment_status === "rejected" && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">
                    Pembayaran Ditolak
                  </p>
                  <Button
                    onClick={() =>
                      navigate(`/event/${event.id}/bayar`, {
                        state: {
                          selectedPosition: registration.position,
                          positionPrice: positionPricing.find(
                            (p) => p.position === registration.position
                          )?.price ?? 0,
                        },
                      })
                    }
                    className="w-full mt-3"
                    variant="destructive"
                  >
                    Kirim Ulang Bukti Pembayaran
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Tombol Daftar Utama */}
              <Button
                onClick={handleRegisterClick}
                disabled={submitting}
                className="w-full text-white text-sm sm:text-base font-bold bg-green-600 hover:bg-green-700"
              >
                {submitting
                  ? "Mendaftarkan…"
                  : expired
                  ? "Event Sudah Berakhir"
                  : "Daftar Event"}
              </Button>
            </>
          )}
        </div>
      </main>

      {/* ============================================================
          DIALOG: Pilihan Posisi (untuk Sport Event)
      ============================================================ */}
      <Dialog
        open={registrationChoiceOpen}
        onOpenChange={setRegistrationChoiceOpen}
      >
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isSportEvent
                ? "Pilih Posisi Anda"
                : "Pilih Peserta"}
            </DialogTitle>
          </DialogHeader>

          {isSportEvent ? (
            <div className="space-y-4">
              {/* Info event */}
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-bold">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.starts_at).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {/* Pilihan Posisi */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Pilih Posisi Pendaftaran:
                </Label>
                <div className="grid gap-2">
                  {positionPricing.map((pricing) => (
                    <button
                      key={pricing.id}
                      type="button"
                      onClick={() => setSelectedPosition(pricing.position)}
                      className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all ${
                        selectedPosition === pricing.position
                          ? "border-green-500 bg-green-50 shadow-sm"
                          : "border-border bg-background hover:bg-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedPosition === pricing.position
                              ? "border-green-500 bg-green-500"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {selectedPosition === pricing.position && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="font-medium text-sm">
                          {pricing.position}
                        </span>
                      </div>
                      <span className="text-green-600 font-bold text-sm">
                        Rp {pricing.price.toLocaleString("id-ID")}
                      </span>
                    </button>
                  ))}
                </div>

                {positionPricing.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Konfigurasi harga posisi belum tersedia.
                  </p>
                )}
              </div>

              {/* Summary */}
              {selectedPosition && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Posisi:
                    </span>
                    <span className="text-sm font-medium">
                      {selectedPosition}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted-foreground">
                      Biaya Pendaftaran:
                    </span>
                    <span className="text-lg font-bold text-primary">
                      Rp{" "}
                      {positionPricing
                        .find((p) => p.position === selectedPosition)
                        ?.price.toLocaleString("id-ID") ?? 0}
                    </span>
                  </div>
                </div>
              )}

              {/* Tombol Lanjut */}
              <Button
                className="w-full h-12 font-bold bg-green-600 hover:bg-green-700 text-white"
                disabled={!selectedPosition || submitting}
                onClick={proceedToPayment}
              >
                Lanjutkan ke Pembayaran
              </Button>
            </div>
          ) : (
            /* Dialog pendaftaran biasa (non-sport) */
            <div className="space-y-4">
              <Button
                className="w-full"
                disabled={submitting}
                onClick={() => {
                  setRegistrationChoiceOpen(false);
                  navigate(`/event/${event.id}/bayar`);
                }}
              >
                Daftar Diri Sendiri
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
```

---

## Implementasi Halaman Pembayaran

### File: `src/pages/Payment.tsx`

Halaman pembayaran dimodifikasi untuk menerima posisi dari `location.state`, menampilkan harga sesuai posisi, dan menyediakan tombol konfirmasi WhatsApp.

```tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import {
  ChevronLeft, CreditCard, Info, MessageCircle,
  CheckCircle2, Download, Smartphone, Wallet, Check,
  Upload,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ============================================================
// KONSTANTA
// ============================================================
const WA_CONFIRMATION_NUMBER = "6285111514040";
const SPORT_EVENT_TYPES = ["futsal", "mini-soccer"];

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function Payment() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Ambil state posisi dari halaman sebelumnya
  type PaymentState = {
    selectedPosition?: string;
    positionPrice?: number;
    guests?: any[];
    includeSelf?: boolean;
  };
  const paymentState = location.state as PaymentState | null;
  const selectedPosition = paymentState?.selectedPosition || null;
  const positionPrice = paymentState?.positionPrice || 0;

  // State
  const [event, setEvent] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    proofFile: null as File | null,
    donorMessage: "",
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // ============================================================
  // LOAD EVENT & PRICING
  // ============================================================
  useEffect(() => {
    (async () => {
      if (!id) return;

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (eventError || !eventData) {
        toast.error("Event tidak ditemukan");
        navigate("/");
        return;
      }
      setEvent(eventData);

      // Default amount: untuk sport event, gunakan harga posisi
      const isSportEvent = SPORT_EVENT_TYPES.includes(eventData.event_type);
      const defaultAmount = isSportEvent
        ? positionPrice
        : eventData.price || 0;

      setPaymentForm((prev) => ({ ...prev, amount: defaultAmount }));

      // Cek registration existing
      if (user && !paymentState?.guests?.length) {
        const { data: regData } = await supabase
          .from("registrations")
          .select("*")
          .eq("event_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        setRegistration(regData);
      }

      // Load payment method (QRIS)
      if (eventData.registration_type === "paid") {
        const { data: qrisData } = await supabase
          .from("qris_methods")
          .select("*")
          .eq("category", "paid")
          .eq("is_active", true)
          .order("order_index", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (qrisData) {
          setPaymentMethod({
            id: qrisData.id,
            name: qrisData.name,
            type: "qris",
            qr_url: qrisData.qr_url,
            description: qrisData.description,
          });
        }
      }

      setLoading(false);
    })();
  }, [id, user, navigate, selectedPosition, positionPrice]);

  // ============================================================
  // FUNGSI: Konversi gambar ke WebP
  // ============================================================
  const convertToWebP = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Could not get canvas context"));
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) =>
              blob ? resolve(blob) : reject(new Error("Conversion failed")),
            "image/webp",
            0.8
          );
        };
        img.onerror = () => reject(new Error("Could not load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  };

  // ============================================================
  // FUNGSI: Submit Pembayaran
  // ============================================================
  const submitPayment = async () => {
    if (!paymentForm.proofFile) {
      return toast.error("Upload bukti pembayaran terlebih dahulu");
    }
    if (paymentForm.amount <= 0) {
      return toast.error("Nominal pembayaran tidak valid");
    }

    setSubmitting(true);
    try {
      // 1. Konversi dan upload bukti
      const webpFile = await convertToWebP(paymentForm.proofFile);
      const fileName = `${user?.id}/${event.id}/${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("payment_proofs")
        .upload(fileName, webpFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment_proofs")
        .getPublicUrl(fileName);

      // 2. Insert registration
      const registrationData = {
        event_id: event.id,
        user_id: user?.id,
        registered_by: user?.id,
        payment_status: "pending" as const,
        amount_paid: paymentForm.amount,
        payment_proof_url: publicUrl,
        paid_at: new Date().toISOString(),
        donor_message: paymentForm.donorMessage?.trim()
          ? paymentForm.donorMessage.trim().slice(0, 500)
          : null,
        position: selectedPosition || null,
        attendance_mode: "offline" as const,
      };

      const { error: insertError } = await supabase
        .from("registrations")
        .insert(registrationData);

      if (insertError) throw insertError;

      setPaymentSuccess(true);
      setRegistration({ ...registrationData });
      toast.success("Bukti pembayaran berhasil diunggah!");
    } catch (error: any) {
      toast.error(error.message || "Gagal memproses pembayaran");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // FUNGSI: Generate Pesan WhatsApp
  // ============================================================
  const generateWAMessage = (): string => {
    const eventName = event?.title || "";
    const name = profile?.full_name || "Peserta";
    const pos = selectedPosition || "-";
    const amount = paymentForm.amount.toLocaleString("id-ID");

    return `Assalamu'alaikum Admin TD-Profile

Saya telah melakukan pembayaran pendaftaran event:

━━━━━━━━━━━━━━━━━━━━
📋 Detail Pendaftaran
━━━━━━━━━━━━━━━━━━━━
👤 Nama        : ${name}
🏟️ Event      : ${eventName}
📍 Posisi     : ${pos}
💰 Nominal    : Rp ${amount}
━━━━━━━━━━━━━━━━━━━━

Mohon bantuan untuk verifikasi pembayaran saya.
Terima kasih. 🙏`;
  };

  const openWhatsApp = () => {
    const message = generateWAMessage();
    const url = `https://wa.me/${WA_CONFIRMATION_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ============================================================
  // RENDER: Loading
  // ============================================================
  if (loading)
    return (
      <div className="min-h-screen bg-background pb-32">
        <Header />
        <main className="container max-w-3xl py-4 px-3">
          <Skeleton className="mb-4 h-6 w-32 rounded" />
          <div className="space-y-6 rounded-2xl border bg-card p-6">
            <Skeleton className="h-6 w-1/2 rounded" />
            <Skeleton className="h-64 w-64 rounded-2xl mx-auto" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </main>
        <BottomNav />
      </div>
    );

  // ============================================================
  // RENDER: Pembayaran Sudah Sukses
  // ============================================================
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <Header />
        <main className="container max-w-3xl py-4 px-3">
          <button
            onClick={() => navigate(`/event/${id}`)}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Kembali ke Detail Event
          </button>

          {/* Success Card */}
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="font-display text-xl font-bold text-green-800">
              Pendaftaran Berhasil!
            </h2>
            <p className="text-sm text-green-700">
              Bukti pembayaran kamu telah berhasil diunggah dan sedang menunggu
              verifikasi admin. Silakan konfirmasi pembayaran melalui WhatsApp
              untuk mempercepat proses verifikasi.
            </p>

            {/* Detail Pendaftaran */}
            <div className="rounded-xl bg-white/80 border border-green-200 p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Event</span>
                <span className="font-medium">{event?.title}</span>
              </div>
              {selectedPosition && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Posisi</span>
                  <span className="font-medium">{selectedPosition}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nominal</span>
                <span className="font-bold text-green-700">
                  Rp {paymentForm.amount.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Menunggu Verifikasi
                </span>
              </div>
            </div>

            {/* Tombol WhatsApp */}
            <a
              href={`https://wa.me/${WA_CONFIRMATION_NUMBER}?text=${encodeURIComponent(generateWAMessage())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full h-12 text-white font-bold bg-green-500 hover:bg-green-600 shadow-lg">
                <MessageCircle className="mr-2 h-5 w-5" />
                Konfirmasi via WhatsApp
              </Button>
            </a>

            <p className="text-xs text-muted-foreground">
              Klik tombol di atas untuk mengirim pesan konfirmasi ke admin
              melalui WhatsApp.
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ============================================================
  // RENDER: Form Pembayaran
  // ============================================================
  const isPaid = event?.registration_type === "paid";
  const isSportEvent = SPORT_EVENT_TYPES.includes(event?.event_type);

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="container max-w-3xl py-4 px-3">
        <button
          onClick={() => navigate(`/event/${id}`)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali ke Detail Event
        </button>

        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold">
                Pembayaran Event
              </h2>
              {isSportEvent && selectedPosition && (
                <p className="text-xs text-muted-foreground mt-1">
                  Posisi: {selectedPosition}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-6">
            {/* Info Event */}
            <div className="rounded-xl bg-muted/30 p-4">
              <h3 className="font-bold text-sm">{event?.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {event?.venue}
              </p>
            </div>

            {/* Metode Pembayaran */}
            {paymentMethod ? (
              <div className="flex flex-col items-center gap-4 rounded-xl bg-muted/30 p-4 border">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  {paymentMethod.name}
                </div>

                {paymentMethod.type === "qris" && paymentMethod.qr_url && (
                  <div className="rounded-2xl border-4 border-white bg-white p-2 shadow-md">
                    <img
                      src={paymentMethod.qr_url}
                      alt="QRIS"
                      className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700 border border-amber-100">
                  <Info className="h-3 w-3" />
                  Scan/bayar dengan aplikasi e-wallet/m-banking Anda
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-destructive/10 p-4 text-center text-xs text-destructive">
                Metode pembayaran belum dikonfigurasi oleh admin.
              </div>
            )}

            {/* Nominal Pembayaran */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Nominal Pembayaran
              </Label>

              {isSportEvent && selectedPosition ? (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Posisi: {selectedPosition}
                      </p>
                      <p className="text-2xl font-bold text-primary mt-1">
                        Rp {paymentForm.amount.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Nominal tetap sesuai posisi yang dipilih. Silakan transfer
                    sesuai nominal di atas.
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-2xl font-bold text-primary">
                    Rp {(event?.price || 0).toLocaleString("id-ID")}
                  </p>
                </div>
              )}
            </div>

            {/* Upload Bukti */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Upload Bukti Pembayaran
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    proofFile: e.target.files?.[0] || null,
                  })
                }
                className="text-xs sm:text-sm"
              />
              {paymentForm.proofFile && (
                <p className="text-xs text-green-600">
                  File terpilih: {paymentForm.proofFile.name}
                </p>
              )}
            </div>

            {/* Pesan (Opsional) */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Pesan (Opsional)
              </Label>
              <Textarea
                value={paymentForm.donorMessage}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    donorMessage: e.target.value.slice(0, 500),
                  })
                }
                placeholder="Tulis pesan di sini..."
                rows={3}
                maxLength={500}
                className="text-sm"
              />
            </div>

            {/* Tombol Submit */}
            <Button
              onClick={submitPayment}
              disabled={submitting || !paymentForm.proofFile}
              className="w-full h-12 font-bold shadow-lg"
            >
              {submitting ? "Mengirim..." : "Konfirmasi Pembayaran"}
            </Button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
```

---

## Implementasi Halaman Admin: Verifikasi Pembayaran

### File: `src/pages/admin/Donations.tsx`

Modifikasi halaman verifikasi admin untuk menampilkan informasi posisi peserta saat memverifikasi pembayaran event futsal/mini soccer.

```tsx
// ============================================================
// MODIFIKASI: Tambahkan kolom 'position' pada query registrations
// ============================================================

// Pada fungsi loadRegistrations / saat memuat data pendaftar:
const loadRegistrations = async () => {
  const { data, error } = await supabase
    .from("registrations")
    .select(`
      *,
      events(id, title, registration_type, event_type),
      profiles!user_id(full_name, phone, gender)
    `)
    .eq("events.registration_type", "paid")
    .order("created_at", { ascending: false });

  return data || [];
};

// ============================================================
// MODIFIKASI: Tambahkan badge posisi pada tampilan registrasi
// ============================================================

// Di dalam render card registrasi, tambahkan badge posisi:
{registration.position && (
  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
    {registration.position}
  </span>
)}

// ============================================================
// MODIFIKASI: Update export ke Excel
// ============================================================

// Tambahkan kolom "Posisi" pada export Excel:
const exportToExcel = () => {
  const headers = [
    "Nama", "No. WA", "Gender", "Event", "Posisi",
    "Nominal", "Status", "Tanggal Daftar",
  ];
  const rows = filteredRegistrations.map((reg) => [
    reg.profiles?.full_name || reg.guest_name || "-",
    reg.profiles?.phone || reg.guest_phone || "-",
    reg.profiles?.gender || reg.guest_gender || "-",
    reg.events?.title || "-",
    reg.position || "-",  // ← Kolom posisi baru
    reg.amount_paid || 0,
    reg.payment_status,
    reg.created_at,
  ]);
  // ... generate excel ...
};
```

---

## Konfigurasi Routing

### File: `src/App.tsx`

Routing untuk halaman pembayaran sudah tersedia di rute `/event/:id/bayar`. Tidak ada perubahan routing yang diperlukan karena halaman `Payment.tsx` sudah di-routing dengan benar dan akan menerima state dari halaman detail event.

```tsx
// Rute yang sudah ada dan tidak perlu diubah:
<Route path="/event/:id/bayar" element={<RequireAuth><Payment /></RequireAuth>} />
```

---

## Ringkasan File yang Dimodifikasi

Tabel berikut merangkum seluruh file yang perlu dibuat atau dimodifikasi:

| File | Aksi | Deskripsi |
| :--- | :--- | :--- |
| `supabase/migrations/20260730000000_add_futsal_pricing.sql` | **Buat Baru** | Migrasi database: tabel `event_position_pricing`, kolom `position` di `registrations`, RLS policies |
| `src/integrations/supabase/types.ts` | **Modifikasi** | Tambah tipe `event_position_pricing` dan kolom `position` di `registrations` |
| `src/pages/admin/Events.tsx` | **Modifikasi** | Tambah field tipe event, konfigurasi harga per posisi pada form CreateEvent |
| `src/pages/EventDetail.tsx` | **Modifikasi** | Tambah dialog pilihan posisi untuk sport event |
| `src/pages/Payment.tsx` | **Modifikasi** | Terima posisi dari state, tampilkan harga sesuai posisi, tombol konfirmasi WhatsApp |
| `src/pages/admin/Donations.tsx` | **Modifikasi** | Tampilkan badge posisi dan kolom export posisi |
| `src/App.tsx` | **Tidak Ada** | Routing sudah tersedia |

---

## Skalabilitas dan Pengembangan Lanjutan

Arsitektur yang dirancang dalam dokumen ini memiliki beberapa keunggulan skalabilitas:

**Ekstensibilitas Posisi.** Tabel `event_position_pricing` memungkinkan admin untuk menambahkan posisi baru kapan saja tanpa mengubah kode. Jika di masa depan diperlukan posisi seperti "Cadangan", "Penyerang", atau "Bek", cukup tambahkan baris baru pada tabel tersebut.

**Dukungan Multi-Tipe Olahraga.** Dengan menggunakan kolom `event_type` pada tabel `events`, platform dapat dengan mudah diperluas untuk mendukung jenis olahraga lain seperti basket, voli, atau badminton. Cukup tambahkan opsi baru pada dropdown tipe event di admin dan atur konfigurasi posisi yang sesuai.

**Harga Dinamis per Event.** Setiap event memiliki konfigurasi harga sendiri-sendiri. Ini berarti event futsal bulan ini bisa memiliki harga berbeda dengan event futsal bulan depan, memberikan fleksibilitas penuh kepada admin.

**Isolasi Logika Bisnis.** Logika harga posisi sepenuhnya terpisah dari logika pendaftaran biasa. Jika suatu saat fitur ini perlu dinonaktifkan atau diubah, cukup modifikasi tabel `event_position_pricing` tanpa mempengaruhi event kajian yang sudah ada.

**Pengembangan Potensial Selanjutnya:**

| Fitur Potensial | Implementasi |
| :--- | :--- |
| Diskon grup (5 pemain ke atas diskon 10%) | Tambah kolom `discount_threshold` dan `discount_percentage` pada tabel `events` |
| Batas kuota per posisi (max 2 kiper) | Tambah kolom `max_quota` pada tabel `event_position_pricing` |
| Notifikasi otomatis saat kuota posisi habis | Real-time subscription Supabase pada event_position_pricing |
| Riwayat posisi di halaman profil peserta | Query kolom `position` dari `registrations` pada halaman Riwayat |
| Statistik pengumpulan per posisi | Agregasi data `event_position_pricing` × `registrations` di dashboard admin |
