import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import "@/components/typography.css";
import "@/components/page-headers.css";
import "@/components/buttons.css";
import "@/components/records.css";
import "@/components/selects.css";
import RowActionTooltip from "@/components/RowActionTooltip";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Perpustakaan Digital | Kemenkum Riau",
  description:
    "Portal perpustakaan digital untuk menemukan koleksi, layanan, dan informasi perpustakaan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={outfit.className}>{children}<RowActionTooltip /></body>
    </html>
  );
}
