import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import "@/components/typography.css";
import "@/components/page-headers.css";
import "@/components/buttons.css";
import "@/components/records.css";
import "@/components/selects.css";
import RowActionTooltip from "@/components/RowActionTooltip";
import PublicPageTransitionController from "@/components/PublicPageTransitionController";
import ActionToast from "@/components/ActionToast";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://portalperpusriau.tech"),
  title: "Perpustakaan Digital Kemenkum Riau | Buku & E-Book",
  description:
    "Jelajahi koleksi buku, e-book, dan informasi layanan Perpustakaan Digital Kemenkum Riau melalui portal perpustakaan online.",
  applicationName: "Perpustakaan Digital Kemenkum Riau",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={outfit.className}>
        <PublicPageTransitionController />
        <ActionToast />
        {children}
        <RowActionTooltip />
      </body>
    </html>
  );
}
