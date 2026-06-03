import { useMemo } from "react";

function extractYoutubeId(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim();
  // Bare ID (11 chars typical)
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace(/^\//, "") || null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/watch")) return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/?#]+)/);
      if (m) return m[2];
    }
  } catch {
    // not a URL — fall through
  }
  // Last-resort regex
  const m = s.match(/[?&]v=([^&#]+)/);
  return m ? m[1] : null;
}

export function YoutubeEmbed({ url, title }: { url?: string | null; title?: string }) {
  const id = useMemo(() => extractYoutubeId(url), [url]);
  if (!id) {
    return (
      <div className="rounded-xl bg-muted p-4 text-center text-xs text-muted-foreground">
        Link video belum valid. Hubungi admin.
      </div>
    );
  }
  const src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={src}
          title={title ?? "YouTube video"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <a
        href={`https://www.youtube.com/watch?v=${id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-xs text-muted-foreground hover:text-foreground underline"
      >
        Buka di YouTube jika video tidak tampil
      </a>
    </div>
  );
}

export default YoutubeEmbed;