import { createRoot } from "react-dom/client";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Opts = {
  title?: string;
  description?: string;
  itemName?: string;
  confirmLabel?: string;
};

function ConfirmDialog({ opts, onDone }: { opts: Opts; onDone: (v: boolean) => void }) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);

  const close = (v: boolean) => {
    setOpen(false);
    setTimeout(() => onDone(v), 150);
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) close(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {step === 1
              ? (opts.title ?? "Anda yakin ingin menghapus?")
              : "Konfirmasi sekali lagi"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {step === 1
              ? (opts.description ??
                  (opts.itemName
                    ? `Data "${opts.itemName}" akan dihapus.`
                    : "Data akan dihapus."))
              : "Tindakan ini tidak dapat dibatalkan. Tekan tombol di bawah untuk menghapus secara permanen."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Batal</AlertDialogCancel>
          {step === 1 ? (
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); setStep(2); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Lanjutkan
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={() => close(true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {opts.confirmLabel ?? "Ya, hapus permanen"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function confirmDelete(opts: Opts = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const finish = (v: boolean) => {
      resolve(v);
      setTimeout(() => {
        root.unmount();
        host.remove();
      }, 200);
    };
    root.render(<ConfirmDialog opts={opts} onDone={finish} />);
  });
}