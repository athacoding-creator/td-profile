import { createRoot, type Root } from "react-dom/client";
import { useEffect, useState } from "react";
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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

let containerRoot: Root | null = null;
let containerEl: HTMLDivElement | null = null;

function ensureContainer(): Root {
  if (containerRoot) return containerRoot;
  containerEl = document.createElement("div");
  document.body.appendChild(containerEl);
  containerRoot = createRoot(containerEl);
  return containerRoot;
}

function Confirm({
  opts,
  onDone,
}: {
  opts: ConfirmOptions;
  onDone: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => onDone(false), 150);
      return () => clearTimeout(t);
    }
  }, [open, onDone]);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opts.title}</AlertDialogTitle>
          {opts.description && (
            <AlertDialogDescription>{opts.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>
            {opts.cancelText ?? "Batal"}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              opts.destructive !== false &&
                buttonVariants({ variant: "destructive" }),
            )}
            onClick={() => {
              setOpen(false);
              onDone(true);
            }}
          >
            {opts.confirmText ?? "Ya, Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const root = ensureContainer();
    const done = (v: boolean) => {
      root.render(<></>);
      resolve(v);
    };
    root.render(<Confirm opts={opts} onDone={done} />);
  });
}