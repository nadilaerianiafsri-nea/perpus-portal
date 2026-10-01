import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

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
      <body className={outfit.className}>{children}</body>
    </html>
  );
}
