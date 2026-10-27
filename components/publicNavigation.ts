export const PUBLIC_NAV_ORDER = [
  "beranda",
  "koleksi",
  "hibah",
  "tentang",
  "panduan",
  "faq",
  "kontak",
] as const;

export type PublicNavKey = (typeof PUBLIC_NAV_ORDER)[number];

export type PublicNavigationDirection =
  | "forward"
  | "backward"
  | null;

export function getPublicNavigationDirection(
  current: PublicNavKey,
  target: PublicNavKey,
): PublicNavigationDirection {
  const currentIndex = PUBLIC_NAV_ORDER.indexOf(current);
  const targetIndex = PUBLIC_NAV_ORDER.indexOf(target);

  if (currentIndex === targetIndex) {
    return null;
  }

  return targetIndex > currentIndex
    ? "forward"
    : "backward";
}
