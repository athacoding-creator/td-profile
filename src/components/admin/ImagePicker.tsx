import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB (batas input awal)
const TARGET_WIDTH = 1200; // Lebar maksimal untuk optimasi

/**
 * Konversi file gambar ke WebP dengan resizing untuk mengurangi ukuran file secara signifikan.
 */
async function optimizeImage(file: File, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      // Resize jika terlalu besar
      if (width > TARGET_WIDTH) {
        height = Math.round((height * TARGET_WIDTH) / width);
        width = TARGET_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context tidak tersedia"));
      
      // Gunakan smoothing untuk kualitas lebih baik saat resize
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      
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
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal memuat gambar"));
    };
    img.src = objectUrl;
  });
}

export async function uploadImage(bucket: string, file: File): Promise<string | null> {
  if (file.size > MAX_SIZE) {
    toast.error("Ukuran gambar terlalu besar (maksimal 10MB)");
    return null;
  }
  if (!file.type.startsWith("image/")) {
    toast.error("File harus berupa gambar");
    return null;
  }

  // Konversi & Kompresi ke WebP sebelum upload
  let uploadFile = file;
  try {
    uploadFile = await optimizeImage(file);
  } catch (err) {
    console.error("Optimization failed:", err);
    // Jika konversi gagal, tetap upload file asli jika ukurannya masuk akal (< 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Gagal mengompresi gambar yang terlalu besar.");
      return null;
    }
    toast.warning("Gagal mengoptimalkan gambar, menggunakan format asli");
  }

  const path = `${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, uploadFile, { 
      cacheControl: "3600", 
      upsert: false, 
      contentType: "image/webp" 
    });
    
  if (error) {
    toast.error("Gagal upload: " + error.message);
    return null;
  }
  
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
    <div className="space-y-3">
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
        <div className="relative group inline-block overflow-hidden rounded-xl border border-border/60 bg-muted/30">
          <img 
            src={value} 
            alt="Preview" 
            className="h-32 w-full sm:w-48 object-cover transition group-hover:opacity-75" 
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <Button 
              type="button" 
              variant="secondary" 
              size="sm" 
              className="h-8 w-8 rounded-full p-0 shadow-lg"
              onClick={() => ref.current?.click()}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1 top-1 rounded-full bg-destructive/90 p-1.5 text-white shadow-sm hover:bg-destructive transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <Button 
          type="button" 
          variant="outline" 
          className="w-full sm:w-auto h-24 border-dashed border-2 flex flex-col gap-2 hover:bg-muted/50 transition" 
          disabled={busy} 
          onClick={() => ref.current?.click()}
        >
          {busy ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs font-medium">Mengoptimalkan & Mengunggah…</span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Upload Gambar</p>
                <p className="text-[10px] text-muted-foreground">Maksimal 10MB (WebP optimized)</p>
              </div>
            </>
          )}
        </Button>
      )}
      
      <div className="flex items-center gap-2">
        <div className="h-[1px] flex-1 bg-border/60"></div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Atau URL</span>
        <div className="h-[1px] flex-1 bg-border/60"></div>
      </div>

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://example.com/image.jpg"
        className="text-xs h-9"
      />
    </div>
  );
}
