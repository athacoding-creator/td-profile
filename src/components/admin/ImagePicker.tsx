import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB (sebelum konversi)

/**
 * Konversi file gambar apa pun ke WebP menggunakan Canvas API browser.
 * Kualitas default 0.85 — keseimbangan antara ukuran & kualitas visual.
 */
async function toWebP(file: File, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context tidak tersedia"));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Konversi WebP gagal"));
          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, "") + ".webp",
            { type: "image/webp" },
          );
          resolve(webpFile);
        },
        "image/webp",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Gagal memuat gambar")); };
    img.src = objectUrl;
  });
}

export async function uploadImage(bucket: string, file: File): Promise<string | null> {
  if (file.size > MAX_SIZE) { toast.error("Ukuran gambar maksimal 5MB"); return null; }
  if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return null; }

  // Konversi ke WebP sebelum upload
  let uploadFile = file;
  try {
    uploadFile = await toWebP(file);
  } catch {
    // Jika konversi gagal, tetap upload file asli
    toast.warning("Konversi WebP gagal, menggunakan format asli");
  }

  const path = `${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, uploadFile, { cacheControl: "3600", upsert: false, contentType: "image/webp" });
  if (error) { toast.error(error.message); return null; }
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function ImagePicker({
  value,
  onChange,
  bucket = "hero",
}: {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          const url = await uploadImage(bucket, f);
          setBusy(false);
          if (url) onChange(url);
        }}
      />
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-28 w-44 rounded-lg object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {busy ? "Mengonversi & mengunggah…" : "Upload gambar"}
        </Button>
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…atau URL gambar"
        className="text-xs"
      />
    </div>
  );
}
