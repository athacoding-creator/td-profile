import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Video } from "lucide-react";

interface AttendanceModeSelectorProps {
  open: boolean;
  onSelect: (mode: "online" | "offline") => void;
  eventTitle: string;
  isOnlineEvent: boolean;
}

export function AttendanceModeSelector({
  open,
  onSelect,
  eventTitle,
  isOnlineEvent,
}: AttendanceModeSelectorProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Pilih Cara Mengikuti</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Tentukan apakah kamu akan mengikuti <strong>{eventTitle}</strong> secara online atau offline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Offline Option */}
          <button
            onClick={() => onSelect("offline")}
            className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="flex-shrink-0 mt-1">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm sm:text-base">Mengikuti Offline</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Hadir langsung ke lokasi. Dapatkan poin dengan scan QR saat acara.
              </p>
            </div>
          </button>

          {/* Online Option */}
          {isOnlineEvent && (
            <button
              onClick={() => onSelect("online")}
              className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-rose-500 hover:bg-rose-50 transition-all text-left"
            >
              <div className="flex-shrink-0 mt-1">
                <Video className="h-5 w-5 text-rose-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base">Mengikuti Online</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Tonton video dari rumah. Daftar dengan berinfaq sukarela.
                </p>
              </div>
            </button>
          )}
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 border border-blue-100">
          💡 <strong>Tips:</strong> Pilih offline jika kamu bisa hadir langsung. Pilih online jika ingin tonton video saja.
        </div>
      </DialogContent>
    </Dialog>
  );
}
