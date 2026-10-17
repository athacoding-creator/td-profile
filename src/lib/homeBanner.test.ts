import { describe, expect, it } from "vitest";
import { bannerCta, hasBannerCta, isSafeBannerUrl } from "./homeBanner";

describe("optional banner CTA", () => {
  it("clears label and link when the admin disables the button", () => {
    expect(bannerCta(false, "Daftar", "https://forms.gle/example")).toEqual({ cta_label: null, cta_href: null });
  });
  it("keeps the configured link when the admin enables the button", () => {
    const cta = bannerCta(true, "Daftar", "https://forms.gle/example");
    expect(cta.cta_href).toBe("https://forms.gle/example");
    expect(hasBannerCta(cta)).toBe(true);
  });
  it("does not show a button without a destination", () => {
    expect(hasBannerCta({ cta_label: "Daftar", cta_href: null })).toBe(false);
  });
  it("rejects executable link protocols", () => {
    expect(isSafeBannerUrl("javascript:alert(1)")).toBe(false);
  });
});