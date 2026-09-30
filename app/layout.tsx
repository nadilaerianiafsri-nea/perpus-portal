import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
