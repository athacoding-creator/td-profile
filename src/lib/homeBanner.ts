export type HomeBannerData = {
  id: string;
  title: string | null;
  image_url: string;
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
};

export function isSafeBannerUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function bannerCta(enabled: boolean, label: string, href: string) {
  return enabled
    ? { cta_label: label.trim(), cta_href: href.trim() }
    : { cta_label: null, cta_href: null };
}

export function hasBannerCta(banner: Pick<HomeBannerData, "cta_label" | "cta_href">): boolean {
  return Boolean(banner.cta_label?.trim() && banner.cta_href && isSafeBannerUrl(banner.cta_href));
}