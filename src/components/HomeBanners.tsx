import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { hasBannerCta, type HomeBannerData } from "@/lib/homeBanner";

export function BannerImage({ banner }: { banner: HomeBannerData }) {
  return (
    <div className="relative aspect-[4/1] w-full overflow-hidden rounded-lg bg-muted">
      <img src={banner.image_url} alt={banner.title || "Teras Dakwah"} decoding="async" className="h-full w-full object-cover" />
      {hasBannerCta(banner) && (
        <Button asChild className="absolute right-3 top-1/2 h-auto min-h-10 max-w-[45%] -translate-y-1/2 gap-1.5 whitespace-normal px-3 py-2 text-xs shadow-md">
          <a href={banner.cta_href ?? undefined} target="_blank" rel="noopener noreferrer">
            <span className="min-w-0 break-words">{banner.cta_label}</span>
            <ArrowUpRight className="h-4 w-4 shrink-0" />
          </a>
        </Button>
      )}
    </div>
  );
}

export default function HomeBanners() {
  const [banners, setBanners] = useState<HomeBannerData[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase.from("hero_slides")
      .select("id,title,image_url,cta_label,cta_href,sort_order,is_active")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at")
      .then(({ data, error }) => {
        if (error) console.error("Gagal memuat banner", error);
        if (!cancelled) setBanners(data ?? []);
      });
    return () => { cancelled = true; };
  }, []);

  if (!banners.length) return null;
  return (
    <section aria-label="Banner Teras Dakwah" className="container mt-4 space-y-3">
      {banners.map((banner) => <BannerImage key={banner.id} banner={banner} />)}
    </section>
  );
}