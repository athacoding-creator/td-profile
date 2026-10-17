# Architecture rules

- Home banners reuse `hero_slides` and the `hero` storage bucket; keep display and management in dedicated modules so event data and settings remain independent.
- A banner CTA is enabled only when both its label and safe HTTP(S) URL are present; disabling it clears both fields to avoid stale links.