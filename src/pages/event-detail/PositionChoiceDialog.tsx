import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isClassEvent } from "@/lib/eventTypes";

export type PositionPricing = { position: string; price: number; max_slots?: number | null; description?: string | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType?: string | null;
  positionPricing: PositionPricing[];
  positionCounts: Record<string, number>;
  onSelect: (pricing: PositionPricing) => void;
};

/** Dialog pilih kelas (Kelas Kajian) / posisi (Olahraga) beserta harga & kuota. */
export function PositionChoiceDialog({ open, onOpenChange, eventType, positionPricing, positionCounts, onSelect }: Props) {
  const isClass = isClassEvent(eventType);
  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{isClass ? "Pilih Kelas" : "Pilih Posisi Bermain"}</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Pilih {isClass ? "kelas" : "posisi"} untuk melihat nominal pendaftaran dan melanjutkan pembayaran.</p>
      <div className="space-y-2">
        {positionPricing.map((pricing) => {
          const cap = pricing.max_slots && pricing.max_slots > 0 ? pricing.max_slots : null;
          const used = positionCounts[pricing.position] ?? 0;
          const full = cap !== null && used >= cap;
          return (
            <button key={pricing.position} type="button" disabled={full} onClick={() => onSelect(pricing)} className="flex w-full items-start justify-between gap-3 rounded-xl border p-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-transparent">
              <span>
                <span className="block font-semibold">{pricing.position}</span>
                {isClass && pricing.description && (
                  <span className="mt-1 block whitespace-pre-line text-xs text-muted-foreground">{pricing.description}</span>
                )}
                {cap !== null && (
                  <span className={`mt-1 block text-xs ${full ? "text-destructive" : "text-muted-foreground"}`}>
                    {full ? "Kuota penuh" : `${used}/${cap} terisi`}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-bold text-primary">Rp {Number(pricing.price).toLocaleString("id-ID")}</span>
            </button>
          );
        })}
      </div>
    </DialogContent>
  );
}
