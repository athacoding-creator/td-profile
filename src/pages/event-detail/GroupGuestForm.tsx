import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Guest = { name: string; phone: string; gender: string };
export const emptyGuest = (): Guest => ({ name: "", phone: "", gender: "" });

type Props = {
  profile: { full_name?: string | null; phone?: string | null } | null;
  guestCount: number;
  setGuestCount: (n: number) => void;
  guests: Guest[];
  setGuests: React.Dispatch<React.SetStateAction<Guest[]>>;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
};

/** Form "Daftarkan Rombongan": data akun + daftar peserta lain. */
export function GroupGuestForm({ profile, guestCount, setGuestCount, guests, setGuests, submitting, onBack, onSubmit }: Props) {
  const updateGuest = (index: number, patch: Partial<Guest>) =>
    setGuests((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Rombongan</p><Button type="button" size="sm" variant="ghost" onClick={onBack}>Kembali</Button></div>
      <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">Data akun kamu akan otomatis didaftarkan: <span className="font-medium text-foreground">{profile?.full_name || "Akun kamu"}</span>{profile?.phone ? ` (${profile.phone})` : ""}</p>
      <p className="text-sm font-medium">Data orang lain</p>
      <div className="space-y-1"><Label>Jumlah peserta</Label><Input type="number" min="1" value={guestCount} onChange={(e) => { const count = Math.max(1, Number(e.target.value) || 1); setGuestCount(count); setGuests((current) => Array.from({ length: count }, (_, index) => current[index] ?? emptyGuest())); }} /></div>
      {guests.map((guest, index) => (
        <div key={index} className="space-y-3 rounded-md bg-muted/40 p-3">
          <p className="text-sm font-medium">Peserta {index + 1}</p>
          <div className="space-y-1"><Label>Nama Lengkap</Label><Input value={guest.name} onChange={(e) => updateGuest(index, { name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Nomor WhatsApp</Label><Input type="tel" value={guest.phone} onChange={(e) => updateGuest(index, { phone: e.target.value })} /></div>
          <div className="space-y-1"><Label>Gender</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={guest.gender} onChange={(e) => updateGuest(index, { gender: e.target.value })}><option value="">Pilih gender</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
        </div>
      ))}
      <Button className="w-full" disabled={submitting} onClick={onSubmit}>Daftarkan Saya & {guestCount} Orang Lain</Button>
    </div>
  );
}
