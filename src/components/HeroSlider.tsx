import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

type Slide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  cta_label: string | null;
  cta_href: string | null;
};

export const HeroSlider = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    supabase
      .from("events")
      .select("id,title,venue,poster_url,starts_at")
      .eq("status", "active")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", weekAhead.toISOString())
      .order("starts_at", { ascending: true })
      .then(({ data }) => {
        const mapped: Slide[] = (data ?? [])
          .filter((e: any) => e.poster_url)
          .map((e: any) => {
            const d = new Date(e.starts_at);
            const tgl = d.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            });
            return {
              id: e.id,
              title: e.title,
              subtitle: `${tgl} • ${e.venue}`,
              image_url: e.poster_url,
              cta_label: "Lihat & Daftar",
              cta_href: `/event/${e.id}`,
            };
          });
        setSlides(mapped);
      });
  }, []);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || slides.length < 2) return;
    const id = setInterval(() => api.scrollNext(), 5000);
    return () => clearInterval(id);
  }, [api, slides.length]);

  if (!slides.length) return null;

  return (
    <section className="relative">
      <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
        <CarouselContent className="ml-0">
          {slides.map((s) => (
            <CarouselItem key={s.id} className="pl-0">
              <div className="relative aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden">
                <img
                  src={s.image_url}
                  alt={s.title ?? "Hero"}
                  className="h-full w-full object-cover"
                />
                {Boolean(s.title || s.subtitle || s.cta_label) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                )}
                <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-10 text-white">
                  {Boolean(s.title) && (
                    <h2 className="font-display text-2xl md:text-4xl font-bold max-w-2xl">
                      {s.title}
                    </h2>
                  )}
                  {Boolean(s.subtitle) && (
                    <p className="mt-2 max-w-xl text-sm md:text-base opacity-90">
                      {s.subtitle}
                    </p>
                  )}
                  {Boolean(s.cta_label && s.cta_href) && (
                    <Link
                      to={s.cta_href!}
                      className="mt-4 inline-block w-fit rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      {s.cta_label}
                    </Link>
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {slides.length > 1 && (
        <>
          <button
            aria-label="Sebelumnya"
            onClick={() => api?.scrollPrev()}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            aria-label="Berikutnya"
            onClick={() => api?.scrollNext()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Slide ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  current === i ? "w-6 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
